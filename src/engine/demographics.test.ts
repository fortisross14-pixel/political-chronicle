import { describe, expect, it } from 'vitest';
import { getRegion, neighborhoodsOf } from '../data';
import {
  applyAction,
  audienceSummary,
  blend,
  deriveMedia,
  deriveOpinions,
  describeDemo,
  groupFit,
  MEDIUM_GROUPS,
  previewEvent,
  profile,
} from './index';
import { readyRun } from './testUtils';

describe('demographics', () => {
  it('profiles share 80% among the named groups, and blends stay normalized', () => {
    const yup = profile('young', 'middle|high', 'college');
    expect(yup.age.young).toBeCloseTo(0.8);
    expect(yup.class.middle + yup.class.high).toBeCloseTo(0.8);
    const mix = blend([
      [yup, 1],
      [profile('senior', 'high', 'any'), 3],
    ]);
    expect(mix.age.young + mix.age.adult + mix.age.senior).toBeCloseTo(1);
    expect(describeDemo(yup)).toBe('Young · Middle–High · College');
  });

  it('who lives there shapes opinions: low-income voters want a higher minimum wage, affluent ones lower taxes', () => {
    const poor = deriveOpinions(0, 'urban', profile('any', 'low', 'any'));
    const rich = deriveOpinions(0, 'urban', profile('any', 'high', 'any'));
    expect(poor.issueOpinion.min_wage).toBeLessThan(rich.issueOpinion.min_wage - 1);
    expect(rich.issueOpinion.taxes).toBeGreaterThan(poor.issueOpinion.taxes + 1);
    expect(poor.issueSalience.min_wage).toBeGreaterThan(rich.issueSalience.min_wage);
  });

  it('TV reaches seniors, social media reaches young adults', () => {
    const seniors = profile('senior');
    const young = profile('young');
    expect(deriveMedia('urban', seniors).tv).toBeGreaterThan(deriveMedia('urban', young).tv);
    expect(deriveMedia('urban', young).social).toBeGreaterThan(deriveMedia('urban', seniors).social);
    expect(groupFit(seniors, MEDIUM_GROUPS.social)).toBeLessThan(1);
    expect(audienceSummary({ senior: 1.5, young: 0.5, adult: 1 })).toEqual({ strong: ['senior'], weak: ['young'] });
  });

  it('social media lands with Elmwood’s young grads and Fort Drum’s young families, less with retirees', () => {
    expect(getRegion('buf-elmwood').media.social).toBeGreaterThan(getRegion('buf-lovejoy').media.social);
    const s = applyAction(readyRun(), { type: 'RESOLVE_DECISIONS', apply: [readyRun().decisions!.cardIds[0]!] });
    const issue = s.career.race!.platform[0]!.issue;
    const reach = (card: string, id: string) => previewEvent(s, card, id, issue).effects.find((e) => e.regionId === id)!.dRecognition;
    const socialVsDoor = (id: string) => reach('social_post', id) / reach('door_knocking', id);
    expect(socialVsDoor('wt-drum')).toBeGreaterThan(socialVsDoor('wt-northside'));
  });

  it('a city’s campaign rolls up into its district, and media carry across the city', () => {
    const s = applyAction(readyRun(), { type: 'RESOLVE_DECISIONS', apply: [readyRun().decisions!.cardIds[0]!] });
    const issue = s.career.race!.platform[0]!.issue;
    const before = s.regions['ny-north']!.recognition;
    const after = applyAction(s, { type: 'PLAY_EVENT', cardUid: 'door_knocking', regionId: 'wt-mill', issue });
    expect(after.regions['wt-mill']!.recognition).toBeGreaterThan(s.regions['wt-mill']!.recognition);
    expect(after.regions['wt-ives']!.recognition).toBeGreaterThan(s.regions['wt-ives']!.recognition); // word of mouth
    expect(after.regions['ny-north']!.recognition).toBeGreaterThan(before);
    expect(after.regions['ny-north']!.recognition - before).toBeLessThan(
      after.regions['wt-mill']!.recognition - s.regions['wt-mill']!.recognition,
    );
    expect(neighborhoodsOf('ny-north')).toContain('wt-mill');
  });

  it('the tracker remembers last turn’s poll for the shift map', () => {
    let s = readyRun();
    s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] });
    s = applyAction(s, { type: 'END_TURN' });
    const prev = s.career.race!.prevPoll!;
    expect(Object.keys(prev)).toHaveLength(7);
    expect(prev['wt-mill']!.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});
