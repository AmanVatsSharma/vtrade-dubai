/**
 * @file route.ts
 * @module admin/workers
 * @description Admin API to view and manage background workers (enable/disable, run once, configure modes).
 * @author BharatERP
 * @created 2026-02-04
 */

export const runtime = "nodejs"

import os from "os"
import { NextResponse } from "next/server"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"
import {
  getWorkersSnapshot,
  POSITION_PNL_MODE_KEY,
  WORKER_TRADING_CATEGORY,
  setWorkerEnabled,
  updateWorkerHeartbeat,
  WORKER_IDS,
} from "@/lib/server/workers/registry"
import { upsertGlobalSetting } from "@/lib/server/workers/system-settings"
import { orderExecutionWorker } from "@/lib/services/order/OrderExecutionWorker"
import { positionPnLWorker } from "@/lib/services/position/PositionPnLWorker"
import { RiskMonitoringService } from "@/lib/services/risk/RiskMonitoringService"
import { isRedisEnabled } from "@/lib/redis/redis-client"

type ToggleWorkerBody = {
  action: "toggle"
  workerId: "order_execution" | "risk_monitoring"
  enabled: boolean
}

type SetModeBody = {
  action: "set_mode"
  workerId: "position_pnl"
  mode: "client" | "server"
}

type RunOnceBody = {
  action: "run_once"
  workerId: "order_execution" | "position_pnl" | "risk_monitoring"
  params?: Record<string, unknown>
}

type WorkersPostBody = ToggleWorkerBody | SetModeBody | RunOnceBody

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/workers",
      required: "admin.system.read",
      fallbackMessage: "Failed to fetch workers",
    },
    async (ctx) => {
      const workers = await getWorkersSnapshot()
      ctx.logger.info({ count: workers.length }, "GET /api/admin/workers - success")
      return NextResponse.json(
        {
          success: true,
          timestamp: new Date().toISOString(),
          workers,
        },
        { status: 200 },
      )
    },
  )
}

export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/workers",
      required: "admin.settings.manage",
      fallbackMessage: "Failed to manage workers",
    },
    async (ctx) => {
      const body = (await req.json().catch(() => null)) as WorkersPostBody | null
      if (!body || typeof body !== "object") {
        throw new AppError({ code: "VALIDATION_ERROR", message: "Invalid JSON body", statusCode: 400 })
      }

      ctx.logger.debug({ action: (body as any).action, workerId: (body as any).workerId }, "POST /api/admin/workers - request")

      if (body.action === "toggle") {
        if (body.workerId !== "order_execution" && body.workerId !== "risk_monitoring") {
          throw new AppError({ code: "VALIDATION_ERROR", message: "Invalid workerId for toggle", statusCode: 400 })
        }
        if (typeof body.enabled !== "boolean") {
          throw new AppError({ code: "VALIDATION_ERROR", message: "enabled must be boolean", statusCode: 400 })
        }

        await setWorkerEnabled(body.workerId, body.enabled)
        const workers = await getWorkersSnapshot()
        return NextResponse.json(
          {
            success: true,
            timestamp: new Date().toISOString(),
            action: "toggle",
            workerId: body.workerId,
            enabled: body.enabled,
            workers,
          },
          { status: 200 },
        )
      }

      if (body.action === "set_mode") {
        if (body.workerId !== "position_pnl") {
          throw new AppError({ code: "VALIDATION_ERROR", message: "Invalid workerId for set_mode", statusCode: 400 })
        }
        const mode = body.mode === "server" ? "server" : "client"

        await upsertGlobalSetting({
          key: POSITION_PNL_MODE_KEY,
          value: mode,
          category: WORKER_TRADING_CATEGORY,
          description: "Position PnL calculation mode: client (quotes-driven) or server (worker-driven)",
        })

        const workers = await getWorkersSnapshot()
        return NextResponse.json(
          {
            success: true,
            timestamp: new Date().toISOString(),
            action: "set_mode",
            workerId: body.workerId,
            mode,
            workers,
          },
          { status: 200 },
        )
      }

      if (body.action === "run_once") {
        if (body.workerId !== "order_execution" && body.workerId !== "position_pnl" && body.workerId !== "risk_monitoring") {
          throw new AppError({ code: "VALIDATION_ERROR", message: "Invalid workerId for run_once", statusCode: 400 })
        }

        const params = body.params || {}
        const startedAt = Date.now()

        if (body.workerId === "order_execution") {
          const limitRaw = params["limit"]
          const maxAgeRaw = params["maxAgeMs"]
          const limit = Number.isFinite(Number(limitRaw)) ? Math.trunc(Number(limitRaw)) : 25
          const maxAgeMs = Number.isFinite(Number(maxAgeRaw)) ? Math.trunc(Number(maxAgeRaw)) : 0
          const result = await orderExecutionWorker.processPendingOrders({ limit, maxAgeMs })
          const workers = await getWorkersSnapshot()
          return NextResponse.json(
            {
              success: true,
              timestamp: new Date().toISOString(),
              action: "run_once",
              workerId: body.workerId,
              elapsedMs: Date.now() - startedAt,
              result,
              workers,
            },
            { status: 200 },
          )
        }

        if (body.workerId === "position_pnl") {
          const limitRaw = params["limit"]
          const updateThresholdRaw = params["updateThreshold"]
          const dryRun = params["dryRun"] === true || params["dryRun"] === "true"
          const limit = Number.isFinite(Number(limitRaw)) ? Math.trunc(Number(limitRaw)) : 500
          const updateThreshold = Number.isFinite(Number(updateThresholdRaw)) ? Number(updateThresholdRaw) : 1
          const result = await positionPnLWorker.processPositionPnL({ limit, updateThreshold, dryRun })
          const workers = await getWorkersSnapshot()
          return NextResponse.json(
            {
              success: true,
              timestamp: new Date().toISOString(),
              action: "run_once",
              workerId: body.workerId,
              elapsedMs: Date.now() - startedAt,
              result,
              workers,
            },
            { status: 200 },
          )
        }

        // risk_monitoring
        const service = new RiskMonitoringService()
        const result = await service.monitorAllAccounts()

        // Write a small heartbeat (risk cron already writes too, but admin-trigger should update visibility)
        await updateWorkerHeartbeat(
          WORKER_IDS.RISK_MONITORING,
          JSON.stringify({
            lastRunAtIso: new Date().toISOString(),
            host: os.hostname(),
            pid: process.pid,
            redisEnabled: isRedisEnabled(),
            source: "admin_run_once",
            checkedAccounts: result.checkedAccounts,
            positionsClosed: result.positionsClosed,
            alertsCreated: result.alertsCreated,
            errorCount: Array.isArray(result.errors) ? result.errors.length : 0,
            elapsedMs: Date.now() - startedAt,
          }),
        )

        const workers = await getWorkersSnapshot()
        return NextResponse.json(
          {
            success: true,
            timestamp: new Date().toISOString(),
            action: "run_once",
            workerId: body.workerId,
            elapsedMs: Date.now() - startedAt,
            result: {
              checkedAccounts: result.checkedAccounts,
              positionsClosed: result.positionsClosed,
              alertsCreated: result.alertsCreated,
              errors: result.errors,
            },
            workers,
          },
          { status: 200 },
        )
      }

      throw new AppError({ code: "VALIDATION_ERROR", message: "Unsupported action", statusCode: 400 })
    },
  )
}

