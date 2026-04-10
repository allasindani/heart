/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { MessageCircle, Shield, Globe, Smartphone, Users, ChevronRight } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col items-center justify-between p-6 md:p-12 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#25D366] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#34B7F1] rounded-full blur-[120px]" />
      </div>

      {/* Top Section: Logo and Welcome */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center text-center max-w-md w-full mt-12"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 bg-[#25D366] rounded-[2rem] flex items-center justify-center shadow-xl shadow-green-200"
          >
            <MessageCircle className="text-white w-14 h-14 fill-current" />
          </motion.div>
          <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-md">
            <Shield className="w-5 h-5 text-[#128C7E]" />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Welcome to WhatsApp
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Simple, reliable, and private messaging and calling, available all over the world.
        </p>
      </motion.div>

      {/* Middle Section: Features Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full my-12"
      >
        <FeatureCard 
          icon={<Shield className="w-6 h-6 text-[#128C7E]" />}
          title="Private"
          description="End-to-end encrypted chats and calls."
        />
        <FeatureCard 
          icon={<Smartphone className="w-6 h-6 text-[#128C7E]" />}
          title="Multi-device"
          description="Use WhatsApp on up to 4 linked devices."
        />
        <FeatureCard 
          icon={<Users className="w-6 h-6 text-[#128C7E]" />}
          title="Communities"
          description="Easily organize and bring groups together."
        />
      </motion.div>

      {/* Bottom Section: Action and Footer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="flex flex-col items-center w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-400">
            Read our <span className="text-[#34B7F1] cursor-pointer hover:underline">Privacy Policy</span>. Tap "Agree and continue" to accept the <span className="text-[#34B7F1] cursor-pointer hover:underline">Terms of Service</span>.
          </p>
          
          <button className="w-full bg-[#25D366] hover:bg-[#20bd5b] text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-100 flex items-center justify-center space-x-2 group">
            <span>AGREE AND CONTINUE</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors group">
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">English</span>
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <span className="text-sm group-hover:underline">Change Language</span>
        </div>

        <div className="pt-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-bold">
            from <span className="text-gray-400">META</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-100 transition-all duration-300 border border-transparent hover:border-gray-100">
      <div className="mb-4 p-3 bg-white rounded-xl shadow-sm">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-snug">{description}</p>
    </div>
  );
}

