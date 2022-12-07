import { DefaultMetricsCollectorConfiguration } from "prom-client";

export interface PromPluginOptions {
  defaultMetrics?: DefaultMetricsCollectorConfiguration;
}
