import seal from '../assets/brand/seal.png';
import './BrandHeader.css';

/** Shared brand lockup for every screen (idle, result, winner-entry) — kept as
 * one component so the client-supplied seal art only has to be wired up once. */
export function BrandHeader() {
  return (
    <header className="brand-header">
      <img src={seal} alt="" className="brand-seal" aria-hidden="true" />
      <span className="brand-text">COALITION COURT REPORTERS</span>
    </header>
  );
}
