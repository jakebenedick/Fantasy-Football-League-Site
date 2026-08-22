import type { MetricColumn } from "../../types";

export type MetricCustomizerProps = {
  availableMetrics: MetricColumn[];
  defaultMetrics: MetricColumn[];
  selectedMetricKeys: string[];
  onSelectedMetricKeysChange: (keys: string[]) => void;
};
