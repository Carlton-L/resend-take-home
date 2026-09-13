import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Development only. The dev server refuses requests for its own resources, including the hot
   * reload channel, when they come from a host it was not started on. Without this, opening the
   * dev server from a phone on the same network loads the markup and never hydrates, so every
   * client component on the page is inert.
   *
   * Set through an environment variable rather than hard coded, because the address changes with
   * the network and this has no meaning in a build.
   */
  allowedDevOrigins: process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : [],
};

export default nextConfig;
