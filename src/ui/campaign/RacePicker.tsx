import { getOffice } from '../../data';
import { fileRaceError, nominationStatus, raceOptions } from '../../engine';
import type { Action, GameState } from '../../engine';

export function RacePicker({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const options = raceOptions(state);
  const last = state.elections.at(-1);

  return (
    <section className="panel">
      <h2>Choose your next race</h2>
      <p className="muted small">
        {last && !last.playerWon
          ? `${state.career.lossStreak} loss${state.career.lossStreak === 1 ? '' : 'es'} in a row — three ends your career. `
          : ''}
        Races decided this year can only be joined at the start of the year; otherwise you file for the next cycle and campaign until then.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Office</th>
            <th>Election</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {options.map((o) => {
            const error = fileRaceError(state, o.officeId);
            return (
              <tr key={o.officeId}>
                <td>
                  {getOffice(o.officeId).name}
                  <div className="muted small">{o.eligible ? nominationStatus(state, o.officeId).text : o.reason}</div>
                </td>
                <td>Nov {o.electionYear}</td>
                <td>
                  <button disabled={!!error} title={error} onClick={() => dispatch({ type: 'FILE_RACE', officeId: o.officeId })}>
                    {{ nominee: 'Run as nominee', primary: 'Enter primary', independent: 'Run as independent', nonpartisan: 'File', denied: 'Denied' }[
                      nominationStatus(state, o.officeId).kind
                    ]}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="row">
        <button
          className="danger"
          onClick={() => {
            if (window.confirm('Retire from politics? This ends the run.')) dispatch({ type: 'RETIRE' });
          }}
        >
          Retire
        </button>
      </div>
    </section>
  );
}
