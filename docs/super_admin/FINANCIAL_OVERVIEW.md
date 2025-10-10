## Financial Overview (Super Admin)

KPIs:
- Total Deposits (COMPLETED)
- Total Withdrawals (COMPLETED)
- Net Flow (Deposits - Withdrawals)
- Pending Deposits / Withdrawals (PENDING/PROCESSING)
- Commission Due (rules-based)

APIs:
- GET `/api/super-admin/finance/summary?from=&to=`
- GET `/api/super-admin/finance/timeseries?granularity=day|week|month&from=&to=`
- GET `/api/super-admin/finance/breakdown?by=status|method|bank|user&from=&to=`
- GET `/api/super-admin/finance/top-users?by=deposits|withdrawals&limit=&from=&to=`
- GET `/api/super-admin/finance/transactions?...` (server-side pagination)
- GET/POST `/api/super-admin/finance/commission-rules`

Commission rules schema:
```
{
  "depositCommissionRate": 0.005,
  "withdrawalCommissionRate": 0.002,
  "includeWithdrawalCharges": true,
  "methodOverrides": {
    "upi": { "depositRate": 0.004 },
    "bank_transfer": { "depositRate": 0.006, "min": 5, "max": 500 }
  },
  "caps": { "perTxnMin": 0, "perTxnMax": 1000 }
}
```
