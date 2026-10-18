import {
  C,
  formatKz,
  durationLabel,
  termName,
  parsePlanDescription,
} from '../lib/talaza';

const THEMES = {
  branco: {
    card: {
      background: '#FFFFFF',
      color: C.ink,
      border: '1px solid #E3EAE7',
    },
    check: C.green,
    checkText: '#FFFFFF',
    button: { background: C.green, color: '#FFFFFF' },
    sub: C.muted,
  },
  dourado: {
    card: {
      background: 'linear-gradient(150deg,#F5C93A,#E6A900 60%,#C98F00)',
      color: '#2B2000',
      boxShadow: '0 14px 34px rgba(230,169,0,.35)',
    },
    check: '#2B2000',
    checkText: '#FFD866',
    button: { background: '#2B2000', color: '#FFD866' },
    sub: '#4A3A00',
  },
  roxo: {
    card: {
      background: 'linear-gradient(150deg,#74399F,#5B2A86 60%,#43196A)',
      color: '#FFFFFF',
    },
    check: C.gold,
    checkText: '#2B2000',
    button: { background: C.gold, color: '#2B2000' },
    sub: '#E3D4F2',
  },
};

export default function PlanCards({
  plans,
  order = ['branco', 'dourado', 'roxo'],
  onChoose,
  disabled = false,
  disabledLabel = 'Indisponível',
  ctaLabel = 'Escolher este plano',
}) {
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {plans.map((plan, index) => {
        const theme = THEMES[order[index % order.length]];
        const { intro, benefits } = parsePlanDescription(plan.description);
        const featured = plans.length >= 3 && index === 1;

        return (
          <article
            key={plan.id}
            style={{
              position: 'relative',
              borderRadius: 22,
              padding: '24px 20px 20px',
              ...theme.card,
            }}
          >
            {featured && (
              <span
                style={{
                  position: 'absolute',
                  right: 16,
                  top: -12,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: '#2B2000',
                  color: '#FFD866',
                  border: `2px solid ${C.greenDark}`,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Mais escolhido
              </span>
            )}

            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
              Plano {termName(plan.duration_days)}
            </h3>

            <p
              style={{
                margin: '4px 0 12px',
                fontSize: 14,
                color: theme.sub,
              }}
            >
              {durationLabel(plan.duration_days)} de presença no Talaza
            </p>

            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {formatKz(plan.price)}
            </div>

            {intro && (
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: theme.sub,
                }}
              >
                {intro}
              </p>
            )}

            <ul
              style={{
                listStyle: 'none',
                margin: '16px 0 20px',
                padding: 0,
                display: 'grid',
                gap: 9,
              }}
            >
              {benefits.map((benefit, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    fontSize: 14.5,
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: 'none',
                      width: 20,
                      height: 20,
                      marginTop: 1,
                      borderRadius: '50%',
                      background: theme.check,
                      color: theme.checkText,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoose(plan)}
              style={{
                display: 'block',
                width: '100%',
                padding: 14,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                ...theme.button,
              }}
            >
              {disabled ? disabledLabel : ctaLabel}
            </button>
          </article>
        );
      })}
    </div>
  );
}
