export const pageMeta = {
  "/": { title: "ez-learningAI | Learn from your course material", description: "Ask questions about your course and get your answers." },
  "/privacy": { title: "Privacy policy | ez-learningAI", description: "Read how ez-learningAI handles account details, and learning conversations." },
  "/terms": { title: "Terms & Conditions | ez-learningAI", description: "Review the terms for using ez-learningAI, uploading course materials, and learning with AI-generated answers." },
  "/contact": { title: "Contact | ez-learningAI", description: "Contact the ez-learningAI team with questions, feedback, or support requests." },
  404: { title: "Page not found | ez-learningAI", description: "The page you requested could not be found." },
};

export function resolvePageMeta(pathname) {
  return pageMeta[pathname] || pageMeta["404"];
}
