import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  CalendarPlus,
  Camera,
  Check,
  CircleCheck,
  HeartPulse,
  MessageCircle,
  Pill,
  Plug,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import { Brand } from "@/components/ui";
import { currentFamily } from "@/lib/auth";
import { login } from "@/app/actions";
import { DEMO } from "@/lib/seed";

export const dynamic = "force-dynamic";

function DemoButton({ className = "btn btn-accent btn-lg" }: { className?: string }) {
  return (
    <form action={login}>
      <input type="hidden" name="email" value={DEMO.email} />
      <input type="hidden" name="password" value={DEMO.password} />
      <button className={className}>
        Try the live demo <ArrowRight />
      </button>
    </form>
  );
}

export default async function Landing() {
  const fam = await currentFamily();
  return (
    <>
      <PublicNav family={fam} />
      <header className="landing-hero">
        <div className="wrap hero-grid">
          <div>
            <span className="pill-tag">
              <b>New</b> Works with the Claude you already pay for
            </span>
            <h1 className="hero-title" style={{ marginTop: 20 }}>
              Your parents are far away. <em>Their care plan doesn’t have to be.</em>
            </h1>
            <p className="hero-lead">
              Send Claude a photo of the prescription. Nearby turns it into a live care plan. The helper at home ticks it off, every sibling sees it, and it shows up in your calendar.
            </p>
            <div className="row" style={{ marginTop: 28, gap: 12 }}>
              {fam ? (
                <Link href="/app" className="btn btn-accent btn-lg">
                  Open your boards <ArrowRight />
                </Link>
              ) : (
                <DemoButton />
              )}
              <Link href="/connect" className="btn btn-lg" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.16)", color: "#fff" }}>
                <Plug /> Connect Claude
              </Link>
            </div>
            <div className="hero-trust">
              <span><ShieldCheck /> No AI inside, no AI bill</span>
              <span><Smartphone /> Helper needs no app</span>
              <span><Users /> Built for siblings in 3 cities</span>
            </div>
          </div>

          <div className="devices" aria-hidden>
            <div className="chatcard">
              <div className="who">
                <span className="av av-sm claude"><Sparkles /></span> Claude
              </div>
              <div className="bubble user">
                <Camera size={13} style={{ verticalAlign: -2 }} /> <em>discharge_summary.jpg</em>
                <br />
                Achan was discharged today. Set up his care board. Rajan checks on him daily.
              </div>
              <div className="bubble ai">
                <span className="toolcall"><Plug /> save_parent</span>
                <span className="toolcall"><Plug /> add_care_plan</span>
                <div>
                  Done ✓ 7 medicines with times (read from the 1-0-1 notation), cardiology review on <b>16 Nov</b>, and a fasting lipid test before it. I’ve made a link for Rajan.
                </div>
              </div>
            </div>
            <div className="phone">
              <div className="screen">
                <div className="notch" />
                <div className="mini-hero">
                  <div className="t">Achan’s day</div>
                  <div className="s">Hi Rajan 👋 Tap Given after each medicine.</div>
                </div>
                <div className="mini-body">
                  <div className="mini-card">
                    <div style={{ fontWeight: 800, fontSize: 12 }}>Morning</div>
                    <div className="mini-dose g">
                      <span className="pi"><Check /></span>
                      <span><b>Clopilet</b> 75 mg<br /><span style={{ color: "#546d74" }}>Given · Rajan</span></span>
                    </div>
                    <div className="mini-dose g">
                      <span className="pi"><Check /></span>
                      <span><b>Pantop</b> 40 mg<br /><span style={{ color: "#546d74" }}>Given · Rajan</span></span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 12, marginTop: 10 }}>Afternoon</div>
                    <div className="mini-dose" style={{ border: "1.5px solid #f2a93b", background: "#fff" }}>
                      <span className="pi"><Pill /></span>
                      <span><b>Ecosprin</b> 75 mg<br /><span style={{ color: "#546d74" }}>1:00 PM · after lunch</span></span>
                    </div>
                    <div className="mini-btn">
                      <span>✓ Given</span>
                      <span>Skip</span>
                    </div>
                  </div>
                  <div className="mini-card" style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 12 }}>Send an update</div>
                    <div className="mini-dose"><span className="pi"><HeartPulse /></span> BP 128/82</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="section" id="how">
          <div className="kicker">How it works</div>
          <h2 className="section-title">From a photo to a plan the whole family follows, in a minute.</h2>
          <div className="grid cols-3" style={{ marginTop: 28 }}>
            <div className="card feature">
              <div className="f-ico accent"><Camera /></div>
              <div className="step-n">STEP 1</div>
              <h3 style={{ marginTop: 4 }}>Snap it, ask Claude</h3>
              <p>Prescription, discharge summary, lab report. Your Claude reads it, works out the times (1-0-1 too) and saves the plan to Nearby.</p>
            </div>
            <div className="card feature">
              <div className="f-ico"><MessageCircle /></div>
              <div className="step-n">STEP 2</div>
              <h3 style={{ marginTop: 4 }}>The helper ticks it off</h3>
              <p>The nurse, a neighbour or Amma herself gets a WhatsApp link. No app, no login, big buttons: Given, Skip, send a BP reading.</p>
            </div>
            <div className="card feature">
              <div className="f-ico accent"><Sparkles /></div>
              <div className="step-n">STEP 3</div>
              <h3 style={{ marginTop: 4 }}>Ask “How’s Amma?”</h3>
              <p>Days later, from Dubai or Bengaluru, Claude reads what actually happened at home and tells you what needs attention.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="kicker">Why not just Claude?</div>
          <h2 className="section-title">Claude is brilliant in the chat. Care happens after the chat ends.</h2>
          <p className="section-lead">Claude can read the prescription, but it can’t remind the nurse at 8 PM, it forgets by next week, and your parents don’t use it. Nearby is the part that stays.</p>
          <div className="grid cols-4" style={{ marginTop: 28 }}>
            <div className="card feature">
              <div className="f-ico"><BrainCircuit /></div>
              <h3>Remembers everything</h3>
              <p>Every dose, reading and visit, kept long after the chat is closed.</p>
            </div>
            <div className="card feature">
              <div className="f-ico"><Smartphone /></div>
              <h3>Works for people without AI</h3>
              <p>The helper link is a simple page on any phone.</p>
            </div>
            <div className="card feature">
              <div className="f-ico"><CalendarPlus /></div>
              <h3>On every sibling’s calendar</h3>
              <p>One subscription puts every appointment on everyone’s phone.</p>
            </div>
            <div className="card feature">
              <div className="f-ico"><BellRing /></div>
              <h3>One truth, live</h3>
              <p>No more “did anyone book the blood test?” in the family group.</p>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="kicker">Pricing</div>
          <h2 className="section-title">You bring your own Claude, so we don’t charge for AI.</h2>
          <div className="grid cols-3" style={{ marginTop: 28 }}>
            <div className="card plan">
              <h3>Free</h3>
              <div className="price">₹0</div>
              <ul>
                <li><CircleCheck /> 1 parent</li>
                <li><CircleCheck /> Helper link & calendar feed</li>
                <li><CircleCheck /> 30-day history</li>
              </ul>
            </div>
            <div className="card plan featured">
              <div className="row between">
                <h3>Family</h3>
                <span className="badge brand">Most popular</span>
              </div>
              <div className="price">₹299<small>/month</small></div>
              <ul>
                <li><CircleCheck /> Both parents, unlimited siblings & helpers</li>
                <li><CircleCheck /> Full history & doctor-ready summary</li>
                <li><CircleCheck /> Daily digest for the family</li>
              </ul>
            </div>
            <div className="card plan">
              <h3>Abroad</h3>
              <div className="price">$6<small>/month</small></div>
              <ul>
                <li><CircleCheck /> Everything in Family</li>
                <li><CircleCheck /> For families in the Gulf, UK, US</li>
                <li><CircleCheck /> Billed in your currency</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="cta-band">
          <div className="grow">
            <h2>See it with the Menon family’s live board.</h2>
            <p style={{ color: "#b9d2d6", marginTop: 6 }}>Log in to the demo, then connect Claude and send it the sample discharge summary.</p>
          </div>
          {fam ? <Link href="/app" className="btn btn-accent btn-lg">Open app <ArrowRight /></Link> : <DemoButton />}
        </div>

        <footer className="footer row between">
          <Brand />
          <span>© 2026 Nearby · Care coordination, not medical advice. Always follow your doctor.</span>
        </footer>
      </main>
    </>
  );
}
