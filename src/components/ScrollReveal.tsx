"use client";

import { MotionConfig, motion } from "motion/react";

const tags = { div: motion.div, li: motion.li, section: motion.section, article: motion.article, aside: motion.aside, figure: motion.figure };

/**
 * Rises a little into place the first time it scrolls into view. Only opacity and transform animate, so nothing
 * around it reflows (no layout shift). With reduced motion on, it only fades: the rise is skipped.
 * Kept to 300ms, per the design rules (restrained motion).
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
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1], delay }}
      >
        {children}
      </Tag>
    </MotionConfig>
  );
}
