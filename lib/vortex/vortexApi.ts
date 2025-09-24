// import axios from 'axios';

// class VortexAPI {
//     constructor() {
//         const vortexBaseURL = 'https://vortex-api.rupeezy.in/v2'; // Vortex specific URL
//         this.applicationId = process.env.VORTEX_APPLICATION_ID;
//         this.applicationSecret = process.env.VORTEX_APPLICATION_SECRET;
//         this.redirectUri = process.env.VORTEX_REDIRECT_URI;
//         this.accessToken = null;
//         this.refreshToken = null;
//         this.tokenExpiry = null;
//     }

//     // OAuth2 Authentication Flow
//     getAuthUrl(state) {
//         const params = new URLSearchParams({
//             response_type: 'code',
//             client_id: this.applicationId,
//             redirect_uri: this.redirectUri,
//             state: state || 'default_state'
//         });

//         return `https://flow.rupeezy.in?applicationId=${this.applicationId}&${params.toString()}`;
//     }

//     // Exchange authorization code for access token
//     async getAccessToken(authorizationCode) {
//         try {
//             const response = await axios.post(`${this.vortexBaseURL}/oauth/token`, {
//                 grant_type: 'authorization_code',
//                 code: authorizationCode,
//                 client_id: this.applicationId,
//                 client_secret: this.applicationSecret,
//                 redirect_uri: this.redirectUri
//             });

//             this.accessToken = response.data.access_token;
//             this.refreshToken = response.data.refresh_token;
//             this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

//             return response.data;
//         } catch (error) {
//             console.error('Error getting access token:', error);
//             throw new Error('Failed to authenticate with Vortex API');
//         }
//     }

//     // Refresh access token
//     async refreshAccessToken() {
//         try {
//             if (!this.refreshToken) {
//                 throw new Error('No refresh token available');
//             }

//             const response = await axios.post(`${this.vortexBaseURL}/oauth/token`, {
//                 grant_type: 'refresh_token',
//                 refresh_token: this.refreshToken,
//                 client_id: this.applicationId,
//                 client_secret: this.applicationSecret
//             });

//             this.accessToken = response.data.access_token;
//             this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

//             return response.data;
//         } catch (error) {
//             console.error('Error refreshing token:', error);
//             throw new Error('Failed to refresh access token');
//         }
//     }

//     // Ensure valid token
//     async ensureValidToken() {
//         if (!this.accessToken) {
//             throw new Error('No access token. Please authenticate first.');
//         }

//         if (this.tokenExpiry && Date.now() >= this.tokenExpiry - 60000) { // Refresh 1 minute before expiry
//             await this.refreshAccessToken();
//         }

//         return this.accessToken;
//     }

//     // Get API headers
//     async getHeaders() {
//         const token = await this.ensureValidToken();
//         return {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             'Accept': 'application/json'
//         };
//     }

//     // Get user profile
//     async getUserProfile() {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.get(`${this.vortexBaseURL}/user/profile`, {
//                 headers
//             });
//             return response.data;
//         } catch (error) {
//             console.error('Error fetching user profile:', error);
//             throw new Error('Failed to fetch user profile');
//         }
//     }

//     // Search instruments/stocks
//     async searchInstruments(query, exchange = 'NSE_EQ') {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.get(`${this.vortexBaseURL}/search/instruments`, {
//                 headers,
//                 params: {
//                     dhan_target_id: query,
//                     exchange_segment: exchange
//                 }
//             });

//             return response.data.map(instrument => ({
//                 symbol: instrument.trading_symbol,
//                 name: instrument.security_name,
//                 exchange: instrument.exchange_segment,
//                 instrumentToken: instrument.instrument_token,
//                 lotSize: instrument.lot_size,
//                 tickSize: instrument.tick_size
//             }));
//         } catch (error) {
//             console.error('Error searching instruments:', error);
//             // Fallback to mock data for development
//             return this.getMockSearchResults(query);
//         }
//     }

//     // Get live market data (LTP - Last Traded Price)
//     async getLTP(instrumentTokens) {
//         try {
//             const headers = await this.getHeaders();
//             const tokens = Array.isArray(instrumentTokens) ? instrumentTokens : [instrumentTokens];

//             const response = await axios.post(`${this.vortexBaseURL}/market/ltp`, {
//                 instruments: tokens.map(token => ({ instrument_token: token }))
//             }, { headers });

//             return response.data.map(data => ({
//                 instrumentToken: data.instrument_token,
//                 lastPrice: data.last_price,
//                 lastTradeTime: data.last_trade_time
//             }));
//         } catch (error) {
//             console.error('Error fetching LTP:', error);
//             throw new Error('Failed to fetch live prices');
//         }
//     }

//     // Get full market data
//     async getFullMarketData(instrumentTokens) {
//         try {
//             const headers = await this.getHeaders();
//             const tokens = Array.isArray(instrumentTokens) ? instrumentTokens : [instrumentTokens];

//             const response = await axios.post(`${this.vortexBaseURL}/market/full`, {
//                 instruments: tokens.map(token => ({ instrument_token: token }))
//             }, { headers });

//             return response.data.map(data => ({
//                 instrumentToken: data.instrument_token,
//                 symbol: data.trading_symbol,
//                 lastPrice: data.last_price,
//                 open: data.open,
//                 high: data.high,
//                 low: data.low,
//                 close: data.close,
//                 change: data.net_change,
//                 changePercent: data.net_change_percentage,
//                 volume: data.volume,
//                 totalBuyQuantity: data.total_buy_quantity,
//                 totalSellQuantity: data.total_sell_quantity,
//                 lastTradeTime: data.last_trade_time
//             }));
//         } catch (error) {
//             console.error('Error fetching full market data:', error);
//             throw new Error('Failed to fetch market data');
//         }
//     }

//     // Get historical data
//     async getHistoricalData(instrumentToken, fromDate, toDate, resolution = '1day') {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.get(`${this.vortexBaseURL}/charts/historical`, {
//                 headers,
//                 params: {
//                     instrument_token: instrumentToken,
//                     from_date: fromDate,
//                     to_date: toDate,
//                     resolution: resolution
//                 }
//             });

//             return response.data.candles.map(candle => ({
//                 datetime: new Date(candle[0]),
//                 open: candle[1],
//                 high: candle[2],
//                 low: candle[3],
//                 close: candle[4],
//                 volume: candle[5]
//             }));
//         } catch (error) {
//             console.error('Error fetching historical data:', error);
//             throw new Error('Failed to fetch historical data');
//         }
//     }

//     // Get user holdings
//     async getHoldings() {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.get(`${this.vortexBaseURL}/user/holdings`, {
//                 headers
//             });
//             return response.data;
//         } catch (error) {
//             console.error('Error fetching holdings:', error);
//             throw new Error('Failed to fetch holdings');
//         }
//     }

//     // Get user positions
//     async getPositions() {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.get(`${this.vortexBaseURL}/user/positions`, {
//                 headers
//             });
//             return response.data;
//         } catch (error) {
//             console.error('Error fetching positions:', error);
//             throw new Error('Failed to fetch positions');
//         }
//     }

//     // Get user funds
//     async getFunds() {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.get(`${this.vortexBaseURL}/user/funds`, {
//                 headers
//             });
//             return response.data;
//         } catch (error) {
//             console.error('Error fetching funds:', error);
//             throw new Error('Failed to fetch funds');
//         }
//     }

//     // Place order
//     async placeOrder(orderData) {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.post(`${this.vortexBaseURL}/orders/regular`, orderData, {
//                 headers
//             });
//             return response.data;
//         } catch (error) {
//             console.error('Error placing order:', error);
//             throw new Error('Failed to place order');
//         }
//     }

//     // Get order history
//     async getOrders() {
//         try {
//             const headers = await this.getHeaders();
//             const response = await axios.get(`${this.vortexBaseURL}/orders`, {
//                 headers
//             });
//             return response.data;
//         } catch (error) {
//             console.error('Error fetching orders:', error);
//             throw new Error('Failed to fetch orders');
//         }
//     }

//     // Mock data for development/testing
//     getMockSearchResults(query) {
//         const mockStocks = [
//             { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE_EQ', instrumentToken: '738561' },
//             { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE_EQ', instrumentToken: '2953217' },
//             { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE_EQ', instrumentToken: '1333569' },
//             { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE_EQ', instrumentToken: '408065' },
//             { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE_EQ', instrumentToken: '1270529' },
//         ];

//         return mockStocks.filter(stock =>
//             stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
//             stock.name.toLowerCase().includes(query.toLowerCase())
//         );
//     }

//     // Check market status (fallback implementation)
//     getMarketStatus() {
//         const now = new Date();
//         const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
//         const day = istTime.getDay();
//         const hours = istTime.getHours();
//         const minutes = istTime.getMinutes();
//         const currentTime = hours * 60 + minutes;

//         const marketOpen = 9 * 60 + 15; // 9:15 AM
//         const marketClose = 15 * 60 + 30; // 3:30 PM

//         const isOpen = day >= 1 && day <= 5 && currentTime >= marketOpen && currentTime <= marketClose;

//         return {
//             isOpen,
//             nextOpenTime: null,
//             nextCloseTime: null,
//             timezone: 'Asia/Kolkata'
//         };
//     }
// }

// export default new VortexAPI();

