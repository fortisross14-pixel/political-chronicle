// Political events in hand: play for their effect, or discard.
import { getPolicyCard } from '../../data';
import { POLICY_HAND_LIMIT, policyError, policyJurisdiction } from '../../engine';
import type { Action, GameState, RegionId } from '../../engine';
import { PolicyCardView } from '../cards/CardViews';

export function PolicyHand({ state, dispatch, regionId }: { state: GameState; dispatch: (a: Action) => void; regionId: RegionId }) {
  const target = policyJurisdiction(state).includes(regionId) ? regionId : policyJurisdiction(state)[0];
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Political events</h2>
        <span className="muted small">
          {state.policyHand.length}/{POLICY_HAND_LIMIT} · from packs
        </span>
      </div>
      {state.policyHand.length === 0 ? (
        <p className="muted small">None yet. Buy a political events pack.</p>
      ) : (
        <div className="card-row">
          {state.policyHand.map((c) => {
            const card = getPolicyCard(c.cardId);
            const region = card.targetsRegion ? target : undefined;
            const error = policyError(state, c.uid, region);
            return (
              <PolicyCardView key={c.uid} id={c.cardId} dim={!!error}>
                <button
                  className="primary"
                  disabled={!!error}
                  title={error}
                  onClick={() => dispatch({ type: 'PLAY_POLICY', uid: c.uid, regionId: region })}
                >
                  Play
                </button>
                <button onClick={() => dispatch({ type: 'DISCARD_CARD', zone: 'policy', uid: c.uid })}>Discard</button>
              </PolicyCardView>
            );
          })}
        </div>
      )}
    </section>
  );
}
