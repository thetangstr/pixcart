import { redirect } from "next/navigation";
import { getVariant } from "@/lib/ab-testing";

export default async function HomePage() {
  // Get or assign A/B test variant
  const variant = await getVariant();
  
  // Redirect to appropriate variant - route groups are not part of the URL
  const targetPath = variant === 'simple' ? '/simple' : '/detailed';
  redirect(targetPath);
}