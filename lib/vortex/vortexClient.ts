var VortexAPI = require("@rupeezy/jsvortex").VortexAPI
var Constants = require("@rupeezy/jsvortex").Constants

var client = new VortexAPI(
    process.env.VORTEX_X_API_KEY,
    process.env.VORTEX_APPLICATION_ID
)

// Get an auth code from sso login. SSO Login URL can be gotten by 

var login_url = client.sso_login_url("any param of your choice")

// Exchange auth code for access token
var auth_code = "auth code received after login"
client.exchange_token(auth_code).then(async (res) => {
    await run()
}).catch((err) => {
    console.log(err)
})

async function run() {
    var order_book = await client.orders()
    console.log("order book", order_book)

    var positions = await client.positions()
    console.log("positions", positions)

    client.quotes(["NSE_EQ-22"], Constants.QuoteModes.LTP).then((res) => {
        return client.place_order(Constants.ExchangeTypes.NSE_EQUITY, 22, Constants.TransactionTypes.SELL, Constants.ProductTypes.INTRADAY, Constants.VarietyTypes.REGULAR_MARKET_ORDER, 1, res.data["NSE_EQ-22"].last_trade_price, 0, 0, Constants.ValidityTypes.FULL_DAY)
    })
        .then((res) => {
            console.log(res)
        }).catch((err) => {
            console.log(err)
        })
}