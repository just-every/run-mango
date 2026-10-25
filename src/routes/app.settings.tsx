import {PreferenceSettingsPanel} from '@/core/features/settings/preference-settings-panel';
import {LinkHostSourcePanel} from '@/core/features/settings/link-host-source-panel';
import {OptInSettings} from '@/core/features/audience/ui/opt-in-settings';
import {AnalyticsSettingsPanel} from '@/core/features/settings/analytics-settings-panel';
import {SignupCapacitySettings} from '@/core/features/audience/ui/signup-capacity-settings';
import {SignupRefusalReport} from '@/core/features/audience/ui/signup-refusal-report';
import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { SettingsWithUsage } from '@/core/features/insights/ui/settings-usage';
export const Route = createFileRoute('/app/settings')({component: editorLeaf(SettingsWithSignup)});

function SettingsWithSignup(){return <><SettingsWithUsage/><SignupCapacitySettings/><SignupRefusalReport/><AnalyticsSettingsPanel/><OptInSettings/><LinkHostSourcePanel/><PreferenceSettingsPanel/></>;}
