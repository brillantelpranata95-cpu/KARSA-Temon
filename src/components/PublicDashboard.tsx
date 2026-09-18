import React from "react";
import { HeroSection } from "./HeroSection";

interface PublicDashboardProps {
  loading: boolean;
  onLogin: () => Promise<void>;
}

/** Pre-login surface: full-viewport hero only — no top navbar. */
export const PublicDashboard: React.FC<PublicDashboardProps> = ({ loading, onLogin }) => {
  return <HeroSection variant="public" loading={loading} onLogin={onLogin} />;
};
