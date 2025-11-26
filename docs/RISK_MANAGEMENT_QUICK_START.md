# Risk Management Quick Start Guide

## Problem Solved

✅ **Server-side P&L calculation** - No longer client-side only  
✅ **Automatic position closure** - Closes positions when loss exceeds 90% of available funds  
✅ **Works 24/7** - Even when users close their app  
✅ **Warning alerts** - Alerts at 80% threshold before auto-close  

## Quick Setup

### 1. Test Manually (Admin Console)

1. Go to: **Admin Console → Risk Management → Risk Monitoring**
2. Click **"Run Risk Monitoring Now"**
3. View results

### 2. Set Up Automated Cron

#### For Vercel:

Create/update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/risk-monitoring",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

Set environment variable in Vercel:
```
CRON_SECRET=your-secret-here
```

#### For External Cron:

```bash
# Every minute
curl -H "Authorization: Bearer YOUR_SECRET" \
  https://your-domain.com/api/cron/risk-monitoring
```

### 3. Configure Thresholds (Optional)

Default thresholds:
- **Warning**: 80% (creates alert)
- **Auto-Close**: 90% (closes positions)

To change, set environment variables:
```bash
RISK_WARNING_THRESHOLD=0.80
RISK_AUTO_CLOSE_THRESHOLD=0.90
```

Or configure in admin console when running manually.

## How It Works

1. **Monitors all accounts** with open positions
2. **Calculates P&L server-side** using live market data
3. **Checks margin utilization**: `|Loss| / Available Funds`
4. **At 80%**: Creates HIGH severity alert
5. **At 90%**: Auto-closes losing positions (worst first)

## API Endpoints

- `POST /api/admin/risk/monitor` - Manual trigger (admin)
- `GET /api/cron/risk-monitoring` - Cron endpoint (protected)

## Monitoring

- **Admin Console**: Risk Management → Risk Monitoring tab
- **Alerts**: Risk Management → User Risk Limits → Risk Alerts
- **Logs**: Check console logs for `[RISK-MONITORING-SERVICE]`

## Important Notes

⚠️ **Market Hours**: Consider running only during market hours  
⚠️ **Frequency**: Recommended every 30-60 seconds during trading  
⚠️ **Testing**: Test with small thresholds first  
⚠️ **Backup**: Keep manual monitoring as backup  

## Troubleshooting

**Positions not closing?**
- Check threshold configuration
- Verify market data API is accessible
- Check logs for errors

**Cron not running?**
- Verify `CRON_SECRET` is set
- Test endpoint manually
- Check cron service logs

For detailed documentation, see: `docs/RISK_MANAGEMENT_SYSTEM.md`
