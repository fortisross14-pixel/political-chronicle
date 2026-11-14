import { getPerson, PERK_TEXT, ROLE_HINTS, ROLE_LABELS } from '../../data';
import type { Person } from '../../data';
import { ROLES, roleActive, ROSTER_LIMIT, SKILL_CODES } from '../../engine';
import type { Action, GameState, SkillId } from '../../engine';

export function PersonCard({ person, children, dim }: { person: Person; children?: React.ReactNode; dim?: boolean }) {
  return (
    <article className={`person-card ${person.rarity}${dim ? ' dim' : ''}`}>
      <div className="person-head">
        <strong>{person.name}</strong>
        <span className={`rarity ${person.rarity}`}>{person.rarity}</span>
      </div>
      <span className="muted small">{ROLE_LABELS[person.role]}</span>
      <span className="chips">
        {(Object.entries(person.boosts) as [SkillId, number][]).map(([id, v]) => (
          <span key={id} className="chip">
            {SKILL_CODES[id]} +{v}
          </span>
        ))}
        {person.perk && <span className="chip perk">{PERK_TEXT[person.perk]}</span>}
      </span>
      <span className="small muted">{person.bio}</span>
      {children && <div className="row">{children}</div>}
    </article>
  );
}

export function TeamPanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const { cards, assigned } = state.team;
  const assignedUids = new Set(Object.values(assigned));
  const reserve = cards.filter((c) => !assignedUids.has(c.uid));

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Your team</h2>
        <span className="muted small">
          {cards.length}/{ROSTER_LIMIT} people · hire more in the Market (one-time price, no salary)
        </span>
      </div>
      <div className="role-grid">
        {ROLES.map((role) => {
          const uid = assigned[role];
          const card = uid !== undefined ? cards.find((c) => c.uid === uid) : undefined;
          const active = roleActive(state, role);
          return (
            <div key={role} className="role-slot">
              <div className="role-head">
                <strong>{ROLE_LABELS[role]}</strong>
                <span className={active ? 'fit good' : 'fit mixed'}>{active ? 'active' : 'inactive'}</span>
              </div>
              <span className="muted small">{ROLE_HINTS[role]}</span>
              {card ? (
                <PersonCard person={getPerson(card.personId)} dim={!active}>
                  <button onClick={() => dispatch({ type: 'UNASSIGN_ROLE', role })}>To reserve</button>
                </PersonCard>
              ) : (
                <p className="muted small empty-slot">Empty</p>
              )}
            </div>
          );
        })}
      </div>
      {reserve.length > 0 && (
        <>
          <h3>Reserve</h3>
          <p className="muted small">Kept for later roles. They stay with you through moves and lost elections. Discarding is permanent.</p>
          <div className="person-grid">
            {reserve.map((c) => {
              const person = getPerson(c.personId);
              return (
                <PersonCard key={c.uid} person={person}>
                  <button onClick={() => dispatch({ type: 'ASSIGN_PERSON', uid: c.uid })}>
                    {assigned[person.role] !== undefined ? 'Swap in' : 'Assign'}
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (window.confirm(`Let ${person.name} go for good?`)) dispatch({ type: 'DISCARD_PERSON', uid: c.uid });
                    }}
                  >
                    Discard
                  </button>
                </PersonCard>
              );
            })}
          </div>
        </>
      )}
      {cards.length > 0 && reserve.length === 0 && (
        <p className="muted small">Assigned people can be discarded from the reserve: move them there first.</p>
      )}
    </section>
  );
}
