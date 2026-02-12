module.exports = {
    apps: [
      {
        name: "vtrade-web",
        cwd: "/home/ubuntu/vtrade-dubai",
        script: "node_modules/next/dist/bin/next",
        args: "start -p 3000",
        exec_mode: "cluster",
        instances: "max", // or a number like 2
        env: {
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
          // also set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_BASE_URL, etc (prefer via server env)
        },
        max_memory_restart: "800M",
        time: true,
        kill_timeout: 10000,
      },
  
      {
        name: "vtrade-order-worker",
        cwd: "/home/ubuntu/vtrade-dubai",
        script: "node_modules/tsx/dist/cli.mjs",
        args: "scripts/order-worker.ts",
        exec_mode: "fork",
        instances: 1,
        env: {
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
          ORDER_WORKER_INTERVAL_MS: "750",
          ORDER_WORKER_BATCH_LIMIT: "50",
        },
        max_memory_restart: "500M",
        time: true,
      },
  
      {
        name: "vtrade-position-pnl-worker",
        cwd: "/home/ubuntu/vtrade-dubai",
        script: "node_modules/tsx/dist/cli.mjs",
        args: "scripts/position-pnl-worker.ts",
        exec_mode: "fork",
        instances: 1,
        env: {
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
          POSITION_PNL_WORKER_INTERVAL_MS: "3000",
          POSITION_PNL_WORKER_BATCH_LIMIT: "500",
          POSITION_PNL_UPDATE_THRESHOLD: "1",
        },
        max_memory_restart: "500M",
        time: true,
      },
    ],
  };