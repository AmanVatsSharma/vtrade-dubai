// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getS3Service } from '@/lib/aws-s3'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'uploads/deposits'
    const isPublic = (formData.get('isPublic') as string) === 'true' || true

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type (images only for payment screenshots)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, JPG, WEBP images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 5MB allowed.' },
        { status: 400 }
      )
    }

    // Try S3 upload first
    try {
      const s3 = getS3Service()
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploadResult = await s3.uploadFile(buffer, {
        folder,
        fileName: `${session.user.id}_${Date.now()}_${file.name}`,
        contentType: file.type,
        isPublic,
        metadata: {
          uploadedBy: session.user.id!,
          source: 'user-upload',
          module: 'deposit-proof'
        }
      })

      if (uploadResult.success) {
        console.log('✅ [UPLOAD] Uploaded to S3', { key: uploadResult.key })
        return NextResponse.json({
          success: true,
          url: uploadResult.url,
          key: uploadResult.key,
          bucket: uploadResult.bucket
        })
      }

      console.warn('⚠️ [UPLOAD] S3 returned success=false, falling back to local:', uploadResult.message)
      // fallthrough to local
    } catch (s3Error: any) {
      console.warn('⚠️ [UPLOAD] S3 unavailable or misconfigured, falling back to local:', s3Error?.message)
    }

    // Local fallback: save under public/{folder}
    const safeFolder = folder.replace(/^\/+/, '') // strip leading slashes
    const uploadDir = path.join(process.cwd(), 'public', safeFolder)
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {}

    const timestamp = Date.now()
    const ext = path.extname(file.name) || '.png'
    const filename = `${session.user.id}_${timestamp}${ext}`
    const filePath = path.join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const fileUrl = `/${safeFolder}/${filename}`
    const localKey = `local:${safeFolder}/${filename}`

    console.log('✅ [UPLOAD] Stored locally', { fileUrl })
    return NextResponse.json({ success: true, url: fileUrl, key: localKey })

  } catch (error) {
    console.error('❌ [UPLOAD] File upload error:', error)
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
  }
}