// // components/websocket-example.tsx
// "use client";
// import { useVortexWebSocket } from '@/hooks/use-vortex-websocket';
// import { useState, useEffect } from 'react';

// export default function WebSocketExample() {
//   const [prices, setPrices] = useState<Record<string, number>>({});
  
//   const {
//     isConnected,
//     connect,
//     disconnect,
//     subscribeToLTP,
//     getPrice
//   } = useVortexWebSocket({
//     autoConnect: true
//   });

//   // Subscribe to popular instruments with delay to avoid rate limiting
//   useEffect(() => {
//     if (isConnected) {
//       const subscribeWithDelay = async () => {
//         // NIFTY 50
//         subscribeToLTP('NSE_EQ', 22);
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         // Bank NIFTY
//         subscribeToLTP('NSE_EQ', 23);
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         // Reliance
//         subscribeToLTP('NSE_EQ', 738561);
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         // TCS
//         subscribeToLTP('NSE_EQ', 2953217);
//       };
      
//       subscribeWithDelay();
//     }
//   }, [isConnected, subscribeToLTP]);

//   // Update prices when data changes
//   useEffect(() => {
//     const interval = setInterval(() => {
//       const newPrices: Record<string, number> = {};
      
//       // Get prices for subscribed instruments
//       const instruments = [
//         { name: 'NIFTY', exchange: 'NSE_EQ', token: 22 },
//         { name: 'BANKNIFTY', exchange: 'NSE_EQ', token: 23 },
//         { name: 'RELIANCE', exchange: 'NSE_EQ', token: 738561 },
//         { name: 'TCS', exchange: 'NSE_EQ', token: 2953217 }
//       ];

//       instruments.forEach(instrument => {
//         const price = getPrice(instrument.exchange, instrument.token);
//         if (price?.lastTradePrice) {
//           newPrices[instrument.name] = price.lastTradePrice;
//         }
//       });

//       setPrices(newPrices);
//     }, 1000); // Update every second

//     return () => clearInterval(interval);
//   }, [getPrice]);

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <h1 className="text-2xl font-bold mb-6">Live Market Prices</h1>
      
//       <div className="mb-4">
//         <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
//           isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//         }`}>
//           <div className={`w-2 h-2 rounded-full mr-2 ${
//             isConnected ? 'bg-green-500' : 'bg-red-500'
//           }`}></div>
//           {isConnected ? 'Connected' : 'Disconnected'}
//         </div>
//       </div>

//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         {Object.entries(prices).map(([name, price]) => (
//           <div key={name} className="bg-white p-4 rounded-lg shadow border">
//             <h3 className="font-semibold text-gray-700">{name}</h3>
//             <p className="text-2xl font-bold text-green-600">
//               ₹{price.toFixed(2)}
//             </p>
//           </div>
//         ))}
//       </div>

//       <div className="mt-6">
//         <button
//           onClick={isConnected ? disconnect : connect}
//           className={`px-4 py-2 rounded ${
//             isConnected 
//               ? 'bg-red-500 text-white hover:bg-red-600' 
//               : 'bg-blue-500 text-white hover:bg-blue-600'
//           }`}
//         >
//           {isConnected ? 'Disconnect' : 'Connect'}
//         </button>
//       </div>
//     </div>
//   );
// }
