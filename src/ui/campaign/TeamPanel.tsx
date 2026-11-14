// Your people: four roles and a roster of up to 10. Anyone can take any role; stars say how well.
import { getPerson, ROLE_HINTS, ROLE_LABELS } from '../../data';
import { roleActive, roleOf, roleStars, ROLES, ROSTER_LIMIT } from '../../engine';
import type { Action, GameState, RoleId } from '../../engine';
import { PersonCard, Stars } from '../cards/CardViews';
import { PortraitArt } from '../cards/CardArt';
import { Info } from '../Info';

export { PersonCard };

export function TeamPanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const { cards, assigned } = state.team;
  const ranked = (role: RoleId) => [...cards].sort((a, b) => getPerson(b.personId).stars[role] - getPerson(a.personId).stars[role]);
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>Roles</h2>
        </div>
        <div className="role-grid">
          {ROLES.map((role) => {
            const uid = assigned[role];
            const holder = uid !== undefined ? cards.find((c) => c.uid === uid) : undefined;
            const active = roleActive(state, role);
            return (
              <div key={role} className={`role-slot${active ? ' active' : ''}${holder ? ' filled' : ''}`}>
                <span className="role-face" aria-hidden="true">
                  {holder ? (
                    <PortraitArt id={holder.personId} name={getPerson(holder.personId).name} role={role} />
                  ) : (
                    <span className="role-empty">?</span>
                  )}
                  <span className={`role-state ${active ? 'on' : 'off'}`}>{active ? 'Working' : 'Idle'}</span>
                </span>
                <div className="role-head">
                  <strong>{ROLE_LABELS[role]}</strong>
                  <Info label={ROLE_LABELS[role]} align="right">
                    {ROLE_HINTS[role]} {active ? '' : 'Idle roles do nothing until they apply.'}
                  </Info>
                </div>
                {holder ? (
                  <span className="role-holder">
                    {getPerson(holder.personId).name}
                    <Stars value={getPerson(holder.personId).stars[role]} label={ROLE_LABELS[role]} />
                  </span>
                ) : (
                  <span className="muted small">Empty</span>
                )}
                <label className="field inline">
                  <span className="sr-only">Assign {ROLE_LABELS[role]}</span>
                  <select
                    value={uid ?? ''}
                    onChange={(e) =>
                      e.target.value === ''
                        ? dispatch({ type: 'UNASSIGN_ROLE', role })
                        : dispatch({ type: 'ASSIGN_PERSON', uid: Number(e.target.value), role })
                    }
                  >
                    <option value="">Nobody</option>
                    {ranked(role).map((c) => {
                      const p = getPerson(c.personId);
                      const other = roleOf(state, c.uid);
                      return (
                        <option key={c.uid} value={c.uid}>
                          {p.name} · {p.stars[role]}★{other && other !== role ? ` (now ${ROLE_LABELS[other].toLowerCase()})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
                {active && roleStars(state, role) === 0 && cards.length > 0 && <span className="small neg">Nobody working this role</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Roster</h2>
          <span className="muted small">
            {cards.length}/{ROSTER_LIMIT}
          </span>
        </div>
        {cards.length === 0 ? (
          <p className="muted small">Nobody yet. Open a people pack.</p>
        ) : (
          <div className="card-row">
            {cards.map((c) => {
              const person = getPerson(c.personId);
              const role = roleOf(state, c.uid);
              return (
                <PersonCard key={c.uid} person={person} className={role ? 'assigned' : undefined}>
                  <span className="small">{role ? ROLE_LABELS[role] : 'On the bench'}</span>
                  <button
                    className="danger"
                    onClick={() => {
                      if (window.confirm(`Let ${person.name} go for good?`)) dispatch({ type: 'DISCARD_PERSON', uid: c.uid });
                    }}
                  >
                    Let go
                  </button>
                </PersonCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
