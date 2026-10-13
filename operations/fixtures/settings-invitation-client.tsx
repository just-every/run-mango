import { createRoot } from 'react-dom/client';
import { SettingsOperators } from '../../src/core/features/store/ui/settings-operators';

createRoot(document.getElementById('root')!).render(<SettingsOperators current={{
  id: 'owner', email: 'owner@example.test', displayName: 'Owner', isInitial: true,
}} />);
