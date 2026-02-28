import SettingsPanelShell from '@/components/settings/settings-panel-shell';

export default function UsageTab() {
  return (
    <SettingsPanelShell panelTestId="settings-panel-usage">
      <p className="text-sm text-muted-foreground" data-testid="settings-usage-tab">
        Usage statistics — coming soon.
      </p>
    </SettingsPanelShell>
  );
}
