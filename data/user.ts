import { prisma } from "@/lib/prisma"

export const getUserByEmail = async (email: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })

        return user
    } catch (error) {
        return null
    }
}

export const getUserById = async (id: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id
            }
        })

        return user
    } catch (error) {
        return error || null
    }
}

export const getUserByPhone = async (phone: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                phone
            }
        })

        return user
    } catch (error) {
        return null
    }
}

export const getUserByClientId = async (clientId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                clientId
            }
        })

        return user
    } catch (error) {
        return null
    }
}

export const getUserByIdentifier = async (identifier: string) => {
    try {
        // First try to find by email
        let user = await getUserByEmail(identifier)
        
        if (!user) {
            // Then try by phone number
            user = await getUserByPhone(identifier)
        }
        
        if (!user) {
            // Finally try by clientId
            user = await getUserByClientId(identifier)
        }

        return user
    } catch (error) {
        return null
    }
}
