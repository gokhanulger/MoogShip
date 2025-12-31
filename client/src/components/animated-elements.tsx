import React from 'react';
import { motion, AnimatePresence, Variant } from 'framer-motion';

// Types for different animation variants
type AnimationVariants = {
  hidden: Variant;
  visible: Variant;
  exit?: Variant;
};

// Standard fade animations
export const fadeAnimation: AnimationVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.4 } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: 0.2 } 
  }
};

// Slide-in from bottom animation
export const slideUpAnimation: AnimationVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring',
      duration: 0.5
    }
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.2 } 
  }
};

// Slide-in from right animation
export const slideInFromRight: AnimationVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: 'spring',
      duration: 0.5
    }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 } 
  }
};

// Scale animation (pop effect)
export const popAnimation: AnimationVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring',
      damping: 12,
      stiffness: 200
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.2 } 
  }
};

// Pulse animation for subtle attention
export const pulseAnimation = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse' as const
    }
  }
};

// Success animation with checkmark
export const successAnimation: AnimationVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring',
      damping: 8, 
      stiffness: 100
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.3 } 
  }
};

// Staggered list item animation for multiple items
export const listItemAnimation = (index: number) => ({
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      delay: index * 0.1,
      duration: 0.3
    }
  }
});

// Components that wrap children with animations
type AnimatedElementProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  condition?: boolean;
  id?: string;
};

// FadeIn component - simple fade in animation
export const FadeIn: React.FC<AnimatedElementProps> = ({ 
  children, 
  className = '',
  delay = 0,
  condition = true,
  id
}) => {
  return (
    <AnimatePresence>
      {condition && (
        <motion.div
          key={id}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            ...fadeAnimation,
            visible: {
              ...fadeAnimation.visible,
              transition: { 
                ...fadeAnimation.visible.transition,
                delay 
              }
            }
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// SlideUp component - slides up from bottom
export const SlideUp: React.FC<AnimatedElementProps> = ({ 
  children, 
  className = '',
  delay = 0,
  condition = true,
  id
}) => {
  return (
    <AnimatePresence>
      {condition && (
        <motion.div
          key={id}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            ...slideUpAnimation,
            visible: {
              ...slideUpAnimation.visible,
              transition: { 
                ...slideUpAnimation.visible.transition,
                delay 
              }
            }
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// PopIn component - scale in with spring
export const PopIn: React.FC<AnimatedElementProps> = ({ 
  children, 
  className = '',
  delay = 0,
  condition = true,
  id
}) => {
  return (
    <AnimatePresence>
      {condition && (
        <motion.div
          key={id}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            ...popAnimation,
            visible: {
              ...popAnimation.visible,
              transition: { 
                ...popAnimation.visible.transition,
                delay 
              }
            }
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// SlideInRight component - slides in from right
export const SlideInRight: React.FC<AnimatedElementProps> = ({ 
  children, 
  className = '',
  delay = 0,
  condition = true,
  id
}) => {
  return (
    <AnimatePresence>
      {condition && (
        <motion.div
          key={id}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            ...slideInFromRight,
            visible: {
              ...slideInFromRight.visible,
              transition: { 
                ...slideInFromRight.visible.transition,
                delay 
              }
            }
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// PulseElement component - subtle pulsing animation for attention
export const PulseElement: React.FC<AnimatedElementProps> = ({ 
  children, 
  className = ''
}) => {
  return (
    <motion.div
      animate="pulse"
      variants={pulseAnimation}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Success animation component with a checkmark effect
export const SuccessAnimation: React.FC<AnimatedElementProps> = ({ 
  children, 
  className = '',
  condition = true
}) => {
  return (
    <AnimatePresence>
      {condition && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={successAnimation}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default {
  FadeIn,
  SlideUp,
  PopIn,
  SlideInRight,
  PulseElement,
  SuccessAnimation
};