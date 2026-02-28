# UI Patterns

Research-backed UI patterns for each screen in the Migration Utility Tauri app. Synthesised from Airbyte, Fivetran, dbt Cloud, GitHub Actions, Apache Airflow, Azure Data Studio, and enterprise UX pattern literature.

**Stack context:** React 19, TanStack Router, TanStack Table, Zustand, shadcn/ui, Tailwind 4, Lucide icons.

---

## Screens

- [Stepper / Root Layout](stepper.md) — left sidebar vertical stepper, step states, save-and-resume
- [Scope Selection](scope.md) — schema-grouped table list with per-group select-all
- [Candidacy Review](candidacy.md) — sortable/filterable table, tier badges, inline expansion, Sheet override drawer
- [Table Config](table-config.md) — master-detail split, card-based form sections, agent suggestion indicators
- [Launch Monitor](launch-monitor.md) — Airflow-style agent grid, log stream, partial failure handling
- [Usage](usage.md) — Settings → Usage tab: cost summary cards, bar charts by table/phase, time series, expandable run history

---

## Sources

- [Airbyte Schema Configuration](https://docs.airbyte.com/platform/using-airbyte/configuring-schema)
- [Fivetran Connection Schemas](https://fivetran.com/docs/using-fivetran/fivetran-dashboard/connectors/schema)
- [dbt Cloud Run Visibility](https://docs.getdbt.com/docs/deploy/run-visibility)
- [Azure SQL Migration Extension](https://learn.microsoft.com/en-us/azure-data-studio/extensions/azure-sql-migration-extension)
- [UI Patterns for Async Workflows — LogRocket](https://blog.logrocket.com/ui-patterns-for-async-workflows-background-jobs-and-data-pipelines)
- [Wizard UI Pattern — Eleken](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Data Table Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Airflow UI Overview](https://airflow.apache.org/docs/apache-airflow/stable/ui.html)
- [GitHub Actions Workflow Visualization](https://docs.github.com/actions/managing-workflow-runs/using-the-visualization-graph)
- [PatternFly Filters Design Guidelines](https://www.patternfly.org/patterns/filters/design-guidelines/)
- [Master-Detail Pattern — Medium](https://medium.com/@lucasurbas/case-study-master-detail-pattern-revisited-86c0ed7fc3e)
