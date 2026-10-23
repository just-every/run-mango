import {AnalyticsSettingsPanel} from '@/core/features/settings/analytics-settings-panel';
import {SignupCapacitySettings} from '@/core/features/audience/ui/signup-capacity-settings';
import {SignupRefusalReport} from '@/core/features/audience/ui/signup-refusal-report';
import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/core/features/store/ui/settings-page';
export const Route = createFileRoute('/app/settings')({component: editorLeaf(SettingsWithSignup)});

function SettingsWithSignup(){return <><SettingsPage/><SignupCapacitySettings/><SignupRefusalReport/><AnalyticsSettingsPanel/></>;}
