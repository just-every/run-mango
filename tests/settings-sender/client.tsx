import { createRoot } from 'react-dom/client';
import { SettingsSender } from '../../src/core/features/store/ui/settings-sender';
import '../../src/core/app/client/styles/pages/settings.css';
createRoot(document.getElementById('root')!).render(<SettingsSender />);
