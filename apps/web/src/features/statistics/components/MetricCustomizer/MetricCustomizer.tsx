import type { MetricCustomizerProps } from "./types";

export function MetricCustomizer({
  availableMetrics,
  defaultMetrics,
  selectedMetricKeys,
  onSelectedMetricKeysChange,
}: MetricCustomizerProps) {
  const activeMetricKeys = selectedMetricKeys.length
    ? selectedMetricKeys
    : defaultMetrics.map((metric) => metric.key);
  const categories = Array.from(
    new Set(availableMetrics.map((metric) => metric.category))
  );

  function toggleMetric(key: string) {
    const base = selectedMetricKeys.length
      ? selectedMetricKeys
      : defaultMetrics.map((metric) => metric.key);
    onSelectedMetricKeysChange(
      base.includes(key)
        ? base.filter((metricKey) => metricKey !== key)
        : [...base, key]
    );
  }

  return (
    <details className="metric-customizer">
      <summary>
        <span>
          <strong>Customize stat columns</strong>
          <small>
            {selectedMetricKeys.length
              ? `${selectedMetricKeys.length} custom metrics selected`
              : "Using the recommended position preset"}
          </small>
        </span>
        <span aria-hidden="true">＋</span>
      </summary>
      <div className="metric-customizer-body">
        <div className="metric-presets" aria-label="Statistic presets">
          <button
            type="button"
            className={selectedMetricKeys.length === 0 ? "active" : ""}
            onClick={() => onSelectedMetricKeysChange([])}
          >
            Recommended
          </button>
          {categories.map((category) => {
            const keys = availableMetrics
              .filter((metric) => metric.category === category)
              .map((metric) => metric.key);
            const selected =
              keys.length > 0 &&
              keys.every((key) => selectedMetricKeys.includes(key));
            return (
              <button
                type="button"
                key={category}
                className={selected ? "active" : ""}
                onClick={() => onSelectedMetricKeysChange(keys)}
              >
                {category}
              </button>
            );
          })}
        </div>
        <div className="metric-options">
          {availableMetrics.map((metric) => (
            <label key={metric.key}>
              <input
                type="checkbox"
                checked={activeMetricKeys.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
              />
              <span>
                <strong>{metric.label}</strong>
                <small>{metric.category}</small>
              </span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}
