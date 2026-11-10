import { remediateN4Kana } from './remediate-n4-kana';
import { remediateN4Grammar } from './remediate-n4-grammar';
import { remediateN4Listening } from './remediate-n4-listening';
import { remediateN4Burmese } from './remediate-n4-burmese';
import { remediateN4Pitch } from './remediate-n4-pitch';

export function runAllN4Remediations(): void {
  console.log('================================================================');
  console.log('   STARTING FULL 5-STAGE REMEDIATION PIPELINE FOR JLPT N4      ');
  console.log('================================================================\n');

  console.log('>>> STAGE 1: Kana Glitches, Foreign Character Artifacts & Reading KanaText');
  remediateN4Kana();

  console.log('>>> STAGE 2: Grammar Rule Precision, Distractor Fixes & Example Linking');
  remediateN4Grammar();

  console.log('>>> STAGE 3: Listening Turns Generation & Audio Alignment');
  remediateN4Listening();

  console.log('>>> STAGE 4: Burmese Localization & Template Cleansing');
  remediateN4Burmese();

  console.log('>>> STAGE 5: NHK Standard Pitch Accent Adjustments (L01-L03)');
  remediateN4Pitch();

  console.log('================================================================');
  console.log('   ALL 5 STAGES OF N4 REMEDIATION COMPLETED SUCCESSFULLY!      ');
  console.log('================================================================\n');
}

runAllN4Remediations();
