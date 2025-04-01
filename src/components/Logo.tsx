import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <motion.svg 
      width="32"
      height="32"
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.path
        d="M8 20C8 13.3726 13.3726 8 20 8C26.6274 8 32 13.3726 32 20C32 26.6274 26.6274 32 20 32C16.6863 32 14 29.3137 14 26C14 22.6863 16.6863 20 20 20"
        stroke="url(#gradient1)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ 
          pathLength: { duration: 1.2, ease: "easeOut", delay: 0.2 },
          opacity: { duration: 0.01 }
        }}
      />
      <defs>
        <linearGradient id="gradient1" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop offset="0.5" stopColor="#16A34A" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
      </defs>
    </motion.svg>
    <div className="flex items-center gap-1">
      <motion.span
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.1, delay: 1.2, ease: [0.2, 0.65, 0.3, 0.9] }}
        className="text-sm font-medium text-sidebar-foreground"
      >
        Content
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1, delay: 1.25, ease: [0.2, 0.65, 0.3, 0.9] }}
        className="text-sm font-medium bg-gradient-to-r from-green-500 via-green-600 to-green-700 bg-clip-text text-transparent"
      >
        Gardener
      </motion.span>
      <motion.span
        initial={{ opacity: 0, x: 5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.1, delay: 1.3, ease: [0.2, 0.65, 0.3, 0.9] }}
        className="text-sm font-medium text-sidebar-foreground"
      >
        ai
      </motion.span>
    </div>
  </div>
); 