// import Image from "next/image";
// import Link from "next/link";

// export default function Home() {
//   return (
//     <main className="flex min-h-screen flex-col items-center justify-between p-24">
//       <span className="text-center">
//         Hello World, visit
//         <Link className="px-5 text-pink-500 underline font-bold italic" href={'/api/graphql'}>GraphiQl Panel</Link>
//         to explore the dashboard and wait for the docs to be updated on how to auto-generate Pothos GraphQL input types and crud operations (all queries and mutations).
//         <br />

//       </span>
//         <img 
//         className="border-2 border-white animate-pulse"
//         src="https://media4.giphy.com/media/nvb74G5HEcQhoah9Hv/giphy.gif?cid=6c09b952y19g7w2lhw8fby3jv9n0uua3j9do8nebhuh5wlkm&ep=v1_gifs_search&rid=giphy.gif&ct=g" alt="GraphQl" />
//       Easily convert a prisma schema into a full graphql CRUD API.
//     </main>
//   );
// }


"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

const Candlestick = ({
  x,
  y,
  isGreen,
  height,
  delay = 0,
}: {
  x: number
  y: number
  isGreen: boolean
  height: number
  delay?: number
}) => {
  const bodyHeight = height * 0.6
  const wickHeight = height * 0.4

  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 0.8, scaleY: 1 }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: "easeOut",
      }}
    >
      {/* Upper Wick */}
      <motion.div
        className={`w-0.5 mx-auto ${isGreen ? "bg-emerald-400" : "bg-red-400"}`}
        style={{ height: `${wickHeight / 2}px` }}
        animate={{
          height: [`${wickHeight / 2}px`, `${wickHeight / 2 + 5}px`, `${wickHeight / 2}px`],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: delay,
        }}
      />

      {/* Candle Body */}
      <motion.div
        className={`w-3 ${isGreen ? "bg-emerald-500" : "bg-red-500"} rounded-sm`}
        style={{ height: `${bodyHeight}px` }}
        animate={{
          height: [`${bodyHeight}px`, `${bodyHeight + 8}px`, `${bodyHeight}px`],
        }}
        transition={{
          duration: 2.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: delay + 0.2,
        }}
      />

      {/* Lower Wick */}
      <motion.div
        className={`w-0.5 mx-auto ${isGreen ? "bg-emerald-400" : "bg-red-400"}`}
        style={{ height: `${wickHeight / 2}px` }}
        animate={{
          height: [`${wickHeight / 2}px`, `${wickHeight / 2 + 3}px`, `${wickHeight / 2}px`],
        }}
        transition={{
          duration: 1.8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: delay + 0.4,
        }}
      />
    </motion.div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Candlestick Chart Pattern 1 */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96">
          <Candlestick x={10} y={20} isGreen={true} height={40} delay={0.5} />
          <Candlestick x={25} y={35} isGreen={false} height={35} delay={0.8} />
          <Candlestick x={40} y={15} isGreen={true} height={50} delay={1.1} />
          <Candlestick x={55} y={25} isGreen={true} height={45} delay={1.4} />
          <Candlestick x={70} y={40} isGreen={false} height={30} delay={1.7} />
          <Candlestick x={85} y={10} isGreen={true} height={55} delay={2.0} />
        </div>

        {/* Candlestick Chart Pattern 2 */}
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80">
          <Candlestick x={15} y={60} isGreen={false} height={25} delay={1.0} />
          <Candlestick x={30} y={45} isGreen={true} height={40} delay={1.3} />
          <Candlestick x={45} y={30} isGreen={true} height={35} delay={1.6} />
          <Candlestick x={60} y={50} isGreen={false} height={30} delay={1.9} />
          <Candlestick x={75} y={25} isGreen={true} height={45} delay={2.2} />
        </div>

        {/* Additional scattered candlesticks */}
        <Candlestick x={85} y={15} isGreen={true} height={30} delay={2.5} />
        <Candlestick x={15} y={80} isGreen={false} height={25} delay={2.8} />
        <Candlestick x={75} y={75} isGreen={true} height={35} delay={3.1} />

        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* Navigation */}
      <motion.nav
        className="relative z-50 flex items-center justify-between p-6 lg:px-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="text-white font-bold text-xl">MarketPulse360</span>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <a href="#" className="text-cyan-300 hover:text-cyan-200 transition-colors font-medium">
            Home
          </a>
          <a href="#" className="text-slate-300 hover:text-white transition-colors font-medium">
            Features
          </a>
          <a href="#" className="text-slate-300 hover:text-white transition-colors font-medium">
            Markets
          </a>
          <a href="#" className="text-slate-300 hover:text-white transition-colors font-medium">
            Support
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white bg-transparent"

            >
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero Content */}
      <div className="relative z-40 flex items-center justify-center min-h-[calc(100vh-100px)] px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              className="inline-flex items-center px-6 py-3 rounded-full bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <span className="text-cyan-300 font-medium">A World</span>
              <span className="text-white font-medium ml-1">of Investment Opportunities</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              className="text-5xl lg:text-7xl font-bold leading-tight mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            >
              <span className="text-white text-balance">Your Truly Stock</span>
              <br />
              <span className="text-cyan-300">Market Trading</span>
              <br />
              <span className="text-white">Platform</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              className="text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl text-balance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            >
              Trade across NSE & BSE with over 7500+ listed companies including blue-chip stocks, IPOs, mutual funds,
              and ETFs.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold px-8 py-4 text-lg rounded-xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 group"
                  onClick={() => { window.location.href = '/dashboard' }}
                >
                  Get Started
                  <motion.div
                    className="ml-2"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Right Content - 3D Elements */}
          <div className="relative flex items-center justify-center">
            {/* Central Globe */}
            <motion.div
              className="relative w-80 h-80 lg:w-96 lg:h-96"
              initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
            >
              {/* Globe Background */}
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-cyan-400/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />

              {/* Globe Grid Lines */}
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-cyan-400/40" />
              <div className="absolute inset-8 rounded-full border border-dashed border-cyan-400/30" />

              {/* Globe Center Glow */}
              <div className="absolute inset-1/4 rounded-full bg-gradient-to-r from-cyan-400/30 to-purple-400/30 blur-xl" />
            </motion.div>

            {/* Floating Arrows */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  right: `${20 + i * 15}%`,
                  top: `${30 + i * 10}%`,
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [50, -20, -40, -60],
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.3 + 1,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 2,
                  ease: "easeOut",
                }}
              >
                <div className="w-8 h-16 bg-gradient-to-t from-cyan-400 to-cyan-300 rounded-t-full relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-cyan-300" />
                </div>
              </motion.div>
            ))}

            {/* Trend Lines */}
            <motion.div
              className="absolute bottom-10 right-10 w-32 h-20"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ duration: 2, delay: 1.5, ease: "easeOut" }}
            >
              <svg className="w-full h-full" viewBox="0 0 128 80">
                <motion.path
                  d="M0,60 Q32,40 64,30 T128,10"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
    </div>
  )
}
