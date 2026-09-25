"use client";

import { MotionConfig, motion } from "motion/react";

const tags = { div: motion.div, li: motion.li, section: motion.section, article: motion.article, aside: motion.aside, figure: motion.figure };

/**
 * Rises into place the first time it scrolls into view. Only opacity and transform animate, so nothing
 * around it reflows (no layout shift). With reduced motion on, it only fades: the rise and scale are skipped.
 *
 * `delay` staggers siblings that enter together, e.g. `(i % columns) * 0.15` across a grid row.
 */
export function ScrollReveal({
  as = "div",
  delay = 0,
  className,
  children,
  id,
}: {
  as?: keyof typeof tags;
  delay?: number;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const Tag = tags[as];
  // reducedMotion="user" rather than useReducedMotion(): the server and first client render then match.
  return (
    <MotionConfig reducedMotion="user">
      <Tag
        id={id}
        className={className}
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ type: "spring", stiffness: 70, damping: 18, delay }}
      >
        {children}
      </Tag>
    </MotionConfig>
  );
}
