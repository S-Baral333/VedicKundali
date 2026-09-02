import { motion, AnimatePresence } from "framer-motion";

interface Props {
  show: boolean;
}

/**
 * Thin indeterminate gold bar shown at the top of admin surfaces while
 * a silent revalidation is in flight. Non-blocking, respects reduced motion.
 */
export default function TopRefreshBar({ show }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-50 h-[2px] overflow-hidden pointer-events-none"
          style={{ background: "hsl(var(--primary) / 0.08)" }}
          aria-hidden
        >
          <motion.div
            className="h-full w-1/3"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--primary)) 50%, transparent)",
              boxShadow: "0 0 8px hsl(var(--primary) / 0.6)",
            }}
            animate={{ x: ["-50%", "350%"] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
