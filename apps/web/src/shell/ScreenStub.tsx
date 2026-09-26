// Owner: Shruthi. Shared placeholder rendered by every not-yet-built screen
// during M0, so routing/shell wiring can be verified before M1 fills each
// screen in. Not one of the UI/UX Specs' shared components — delete usages
// as each screen is built for real.
interface ScreenStubProps {
  id: string;
  name: string;
  owner: string;
  feature: string;
}

export function ScreenStub({ id, name, owner, feature }: ScreenStubProps) {
  return (
    <section>
      <h1>
        {id}. {name}
      </h1>
      <p>
        Owner: {owner} · PRD feature: {feature}
      </p>
      <p>Not built yet — see docs/TEAM_OWNERSHIP.md.</p>
    </section>
  );
}
