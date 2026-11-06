import Link from "next/link";
import Nav from "@/components/Nav";
import { currentFamily } from "@/lib/auth";
import { login } from "@/app/actions";
import { DEMO } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const fam = await currentFamily();
  return (
    <>
      <Nav family={fam} />
      <main>
        <section className="container hero">
          <div className="split">
            <div>
              <div className="eyebrow">For children who live far from their parents</div>
              <h1 style={{ marginTop: 14 }}>Your parents are far away. Their care plan doesn’t have to be.</h1>
              <p className="lead">
                Send your Claude a photo of the prescription. Nearby turns it into a live care board that the helper at home ticks off, every sibling can see, and your calendar follows.
              </p>
              <div className="row" style={{ marginTop: 26 }}>
                {fam ? (
                  <Link href="/app" className="btn btn-primary btn-lg">Open your boards</Link>
                ) : (
                  <form action={login}>
                    <input type="hidden" name="email" value={DEMO.email} />
                    <input type="hidden" name="password" value={DEMO.password} />
                    <button className="btn btn-primary btn-lg">Try the live demo</button>
                  </form>
                )}
                <Link href="/connect" className="btn btn-lg">Connect your Claude</Link>
              </div>
              <p className="faint small" style={{ marginTop: 14 }}>No AI inside Nearby. Your own Claude does the reading and writing.</p>
            </div>

            <div className="chat">
              <div className="bubble user">
                📄 <em>discharge_summary.jpg</em>
                <br />
                Achan was discharged today. Set up his care board and make sure Rajan chettan knows what to give when.
              </div>
              <div className="bubble ai">
                <div className="tool">⚙ nearby · save_parent</div>
                <div className="tool">⚙ nearby · add_care_plan (4 medicines, 1 follow-up, 2 tests)</div>
                <div style={{ marginTop: 8 }}>
                  Done. Achan’s board is live, with <strong>Clopidogrel 75 mg</strong> at night and <strong>Aspirin 75 mg</strong> in the morning (from the 0-0-1 and 1-0-0 on the summary), the
                  cardiology review on <strong>20 Nov</strong> and a fasting lipid test before it.
                  <br />
                  <br />
                  One thing to check: the Pantoprazole duration is unclear in the photo. Here’s the helper link to send Rajan on WhatsApp →
                </div>
              </div>
              <div className="bubble user">A week later: How’s Achan doing? Anything I should worry about?</div>
              <div className="bubble ai">
                <div className="tool">⚙ nearby · get_status</div>
                <div style={{ marginTop: 8 }}>Rajan marked 26 of 28 doses. BP readings are steady around 130/85. The lipid test is due Tuesday and nobody’s booked it yet.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="container" id="how">
          <div className="grid grid-3">
            <div className="card feature">
              <div className="icon">1</div>
              <h3>Snap it, ask Claude</h3>
              <p>Prescription, discharge summary, lab report. Your Claude reads it, works out the times (yes, 1-0-1 too) and saves the plan to Nearby.</p>
            </div>
            <div className="card feature">
              <div className="icon">2</div>
              <h3>The helper ticks it off</h3>
              <p>The nurse, neighbour or Amma herself gets a WhatsApp link. No app, no login, big buttons: Given, Skip, send BP reading.</p>
            </div>
            <div className="card feature">
              <div className="icon">3</div>
              <h3>Ask “How’s Amma?”</h3>
              <p>Days later, from Dubai or Bengaluru, Claude reads what actually happened at home and tells you what needs attention.</p>
            </div>
          </div>
        </section>

        <section className="container mt-lg">
          <div className="card" style={{ padding: 32 }}>
            <div className="split" style={{ alignItems: "start" }}>
              <div>
                <div className="eyebrow">Why not just Claude?</div>
                <h2 style={{ marginTop: 10, fontSize: 28 }}>Claude is brilliant in the chat. Care happens after the chat ends.</h2>
                <p className="muted" style={{ marginTop: 12 }}>
                  Claude can read the prescription, but it can’t remind the nurse at 8 PM, it forgets by next week, and your parents and their helper don’t use it. Nearby is the part that stays.
                </p>
              </div>
              <div className="grid grid-2">
                <div>
                  <h3>Keeps working after the chat</h3>
                  <p className="muted small" style={{ marginTop: 4 }}>A live board and a record of every dose, reading and visit.</p>
                </div>
                <div>
                  <h3>Works for people who don’t use AI</h3>
                  <p className="muted small" style={{ marginTop: 4 }}>The helper link is just a web page on any phone.</p>
                </div>
                <div>
                  <h3>In every sibling’s calendar</h3>
                  <p className="muted small" style={{ marginTop: 4 }}>One subscription link puts every appointment on everyone’s phone.</p>
                </div>
                <div>
                  <h3>One truth for the family</h3>
                  <p className="muted small" style={{ marginTop: 4 }}>No more “did anyone book the blood test?” in the family group.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mt-lg" id="pricing">
          <div className="section-head">
            <h2 style={{ fontSize: 28 }}>Simple pricing</h2>
            <span className="muted small">You bring your own Claude, so we don’t charge for AI.</span>
          </div>
          <div className="grid grid-3">
            <div className="card">
              <h3>Free</h3>
              <div className="price" style={{ marginTop: 8 }}>₹0</div>
              <p className="muted small" style={{ marginTop: 8 }}>1 parent · helper link · calendar feed · 30-day history</p>
            </div>
            <div className="card" style={{ borderColor: "var(--brand)", boxShadow: "0 0 0 3px var(--brand-soft)" }}>
              <div className="row between">
                <h3>Family</h3>
                <span className="badge brand">most families</span>
              </div>
              <div className="price" style={{ marginTop: 8 }}>
                ₹299<span className="muted" style={{ fontSize: 16 }}>/month</span>
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>Both parents · unlimited siblings & helpers · full history · daily digest email · doctor-ready PDF summary</p>
            </div>
            <div className="card">
              <h3>Abroad</h3>
              <div className="price" style={{ marginTop: 8 }}>
                $6<span className="muted" style={{ fontSize: 16 }}>/month</span>
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>For families in the Gulf, UK, US. Everything in Family, billed in your currency.</p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="container row between">
            <span>© 2026 Nearby · Care coordination, not medical advice. Always follow your doctor.</span>
            <span>
              <Link href="/connect">Connect Claude</Link> · <Link href="/login">Log in</Link>
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
