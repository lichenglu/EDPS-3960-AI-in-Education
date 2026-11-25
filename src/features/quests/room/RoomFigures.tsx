import { Block, Contact, gold, ink, Oval, paper, Rod, teal, type Vec } from './Primitives';

type Species = 'panda' | 'red-panda' | 'monkey';
const coats = { panda: '#fff4db', 'red-panda': '#d98049', monkey: '#efa955' };
const paws = { panda: '#4b413b', 'red-panda': '#653f31', monkey: '#b97943' };

function Eyes({ species }: { species: Species }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side}>
          {species === 'panda' && (
            <Oval
              at={[side * 0.19, 0.94, 0.315]}
              size={[0.142, 0.173, 0.066]}
              rot={[0, 0, -side * 0.38]}
              color={ink}
            />
          )}
          {species === 'red-panda' && (
            <>
              <Oval
                at={[side * 0.21, 1.045, 0.304]}
                size={[0.103, 0.047, 0.046]}
                rot={[0, 0, side * 0.14]}
                color={paper}
              />
              <Oval
                at={[side * 0.299, 0.83, 0.272]}
                size={[0.13, 0.058, 0.043]}
                rot={[0, 0, side * 0.46]}
                color={paper}
              />
            </>
          )}
          <Oval at={[side * 0.183, 0.946, 0.383]} size={[0.044, 0.057, 0.027]} color="#2e2931" />
          <Oval at={[side * 0.183 - 0.012, 0.964, 0.406]} size={[0.014, 0.017, 0.01]} color="#fff8e9" />
          <Oval
            at={[side * 0.277, 0.841, 0.337]}
            size={[0.054, 0.026, 0.015]}
            color={species === 'red-panda' ? '#eead81' : '#e4a596'}
          />
        </group>
      ))}
    </>
  );
}

function RedEars() {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.303, 1.239, 0]} rotation={[0, 0, -side * 0.24]}>
          <Rod at={[0, 0, 0]} length={0.31} radius={0.14} top={0.022} color="#fff0c6" />
          <Oval at={[0, -0.029, 0.086]} size={[0.079, 0.109, 0.028]} color="#884b42" />
        </group>
      ))}
    </>
  );
}

function Tail({ species }: { species: Species }) {
  if (species === 'panda') return null;
  if (species === 'monkey')
    return (
      <>
        <Oval
          at={[-0.32, 0.26, -0.14]}
          size={[0.335, 0.087, 0.085]}
          rot={[0, 0, -0.46]}
          color={paws.monkey}
        />
        <Oval
          at={[-0.563, 0.392, -0.14]}
          size={[0.094, 0.166, 0.095]}
          rot={[0, 0, -0.21]}
          color={coats.monkey}
        />
      </>
    );
  return (
    <group position={[0.24, 0.15, -0.2]} rotation={[0, 0.08, -0.49]}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Oval
          key={i}
          at={[i * 0.114, i * i * 0.008, 0]}
          size={[0.155 - i * 0.008, 0.135 - i * 0.004, 0.13 - i * 0.005]}
          color={i % 2 ? '#9a5744' : '#efac70'}
        />
      ))}
    </group>
  );
}

export function Figure({
  species,
  at,
  angle = 0,
  scale = 1,
  pose = 'resting',
}: {
  species: Species;
  at: Vec;
  angle?: number;
  scale?: number;
  pose?: 'resting' | 'pointing' | 'waving';
}) {
  const monkey = species === 'monkey';
  const red = species === 'red-panda';
  const raised = pose === 'waving';
  const pointing = pose === 'pointing';
  const coat = coats[species];
  const paw = paws[species];
  return (
    <group position={at} rotation={[0, angle, 0]} scale={scale}>
      <Contact x={0} z={0} />
      <Tail species={species} />
      <Oval
        at={[0, 0.45, 0]}
        size={[0.296, 0.333, 0.225]}
        color={species === 'panda' ? '#6d917f' : red ? '#589980' : '#e5a45b'}
      />
      <Oval
        at={[0, 0.485, 0.185]}
        size={[0.2, 0.22, 0.058]}
        color={species === 'panda' ? '#a3bca5' : red ? '#9fc5a0' : '#f7ca89'}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Oval at={[side * 0.158, 0.109, 0.057]} size={[0.127, 0.106, 0.157]} color={paw} />
          {side === 1 && (raised || pointing) ? (
            <Oval
              at={[raised ? 0.35 : 0.315, raised ? 0.67 : 0.515, pointing ? 0.22 : 0.072]}
              size={[0.102, 0.168, 0.108]}
              rot={[pointing ? 0.95 : -0.2, 0, raised ? -0.48 : 0.43]}
              color={paw}
            />
          ) : (
            <Oval
              at={[side * 0.267, 0.465, 0.096]}
              size={[0.103, 0.162, 0.109]}
              rot={[-0.22, 0, side * 0.27]}
              color={paw}
            />
          )}

          {!red && (
            <>
              <Oval
                at={[side * (monkey ? 0.405 : 0.299), monkey ? 0.979 : 1.204, 0]}
                size={monkey ? [0.142, 0.163, 0.116] : [0.146, 0.153, 0.125]}
                color={paw}
              />
              {monkey && (
                <Oval at={[side * 0.455, 0.982, 0.085]} size={[0.075, 0.083, 0.048]} color="#ecbb90" />
              )}
            </>
          )}
        </group>
      ))}
      <Oval at={[0, 0.933, 0.009]} size={[0.437, 0.365, 0.341]} color={coat} />
      {red && <RedEars />}
      {monkey && (
        <>
          <Oval at={[0, 0.919, 0.292]} size={[0.288, 0.235, 0.089]} color="#92bcc8" />
          <Oval at={[0.03, 1.254, 0.023]} size={[0.144, 0.071, 0.133]} rot={[0, 0, -0.36]} color="#f2bf70" />
        </>
      )}
      <Eyes species={species} />
      <Oval
        at={[0, 0.826, 0.333]}
        size={[monkey ? 0.136 : 0.181, 0.099, 0.092]}
        color={monkey ? '#accbd0' : paper}
      />
      <Oval at={[0, 0.857, 0.418]} size={[0.057, 0.036, 0.026]} color={monkey ? '#53777a' : '#403639'} />
      <Oval at={[0.014, 0.785, 0.407]} size={[0.033, 0.009, 0.012]} color={paw} rot={[0, 0, 0.16]} />
      {species === 'panda' && <Oval at={[0, 0.665, 0.043]} size={[0.259, 0.063, 0.217]} color={gold} />}
      {species === 'panda' && (
        <group rotation={[0, 0.1, -0.15]}>
          <Block at={[-0.02, 0.433, 0.249]} size={[0.294, 0.272, 0.06]} color="#558b74" />
          <Block at={[-0.026, 0.433, 0.285]} size={[0.227, 0.207, 0.018]} color={paper} />
          <Block at={[-0.036, 0.45, 0.299]} size={[0.147, 0.015, 0.012]} color="#a18d70" />
        </group>
      )}
      {red && (
        <group position={[0, 0.43, 0.23]}>
          <Block at={[0, 0, 0]} size={[0.17, 0.09, 0.012]} color="#609c82" />
          <Oval at={[0.03, 0.017, 0.013]} size={[0.031, 0.014, 0.008]} rot={[0, 0, 0.36]} color={paper} />
        </group>
      )}
      {red && (
        <group position={[-0.2, 0.45, 0.243]} rotation={[0.05, 0, -0.32]}>
          <Rod at={[0, 0.09, 0]} radius={0.021} length={0.35} color={gold} />
          <Rod at={[0, 0.288, 0]} radius={0.02} top={0} length={0.046} color={ink} />
        </group>
      )}
      {monkey && (
        <>
          <Block at={[0, 0.484, 0.24]} size={[0.058, 0.523, 0.023]} color={teal} rot={[0, 0, -0.58]} />
          <Block at={[0.129, 0.329, 0.248]} size={[0.206, 0.151, 0.084]} color="#378c80" />
          <Block at={[0.139, 0.368, 0.295]} size={[0.153, 0.022, 0.014]} color={gold} />
        </>
      )}
    </group>
  );
}
