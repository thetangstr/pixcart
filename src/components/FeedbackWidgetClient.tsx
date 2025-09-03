"use client";

import dynamic from "next/dynamic";

const FeedbackWidget = dynamic(() => import("@/components/feedback-widget"), {
  ssr: false,
});

export default FeedbackWidget;