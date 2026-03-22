import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GetCohortResponseDto } from '../types/api';
import {
  CohortComponent,
  ComponentRating,
  FellowshipInterest,
  OpportunityInterest,
} from '../types/enums';
import type { FeedbackFormData } from '../types/feedback';

interface Props {
  cohorts: GetCohortResponseDto[];
  isLoading: boolean;
  onSubmit: (data: FeedbackFormData) => Promise<void>;
  preselectedCohortId?: string;
}

const COMPONENT_LABELS: Record<CohortComponent, string> = {
  [CohortComponent.SESSION_INSTRUCTIONS]: 'Session Instructions',
  [CohortComponent.STUDY_MATERIAL]: 'Study Material',
  [CohortComponent.GROUP_DISCUSSIONS]: 'Group Discussions',
  [CohortComponent.LOUNGE_DISCUSSIONS]: 'Lounge Discussions',
  [CohortComponent.DEPUTY]: 'TA',
  [CohortComponent.TEACHING_ASSISTANTS]: 'Teaching Assistants',
  [CohortComponent.BITSHALA_CLUBS]: 'Bitshala Clubs',
  [CohortComponent.BITDEV_MEETUPS]: 'Bitdev Meetups',
  [CohortComponent.BITSPACE]: 'Bitspace',
  [CohortComponent.FELLOWSHIPS]: 'Fellowships',
};

const RATING_LABELS: Record<ComponentRating, string> = {
  [ComponentRating.NOT_AT_ALL]: 'Not at all',
  [ComponentRating.SOMEWHAT]: 'Somewhat',
  [ComponentRating.HELPFUL]: 'Helpful',
  [ComponentRating.VERY_HELPFUL]: 'Very Helpful',
};

const OPPORTUNITY_LABELS: Record<OpportunityInterest, string> = {
  [OpportunityInterest.DEVELOPER]: 'Developer',
  [OpportunityInterest.DESIGNER_CREATIVE]: 'Designer / Creative',
  [OpportunityInterest.EDUCATION_WRITING]: 'Education / Writing',
  [OpportunityInterest.PROGRAM_OPS]: 'Program Ops',
  [OpportunityInterest.LEGAL_ACCOUNTS]: 'Legal / Accounts',
  [OpportunityInterest.BUILDING_STARTUP]: 'Building a Startup',
  [OpportunityInterest.HOSTING_CLUB]: 'Hosting a Club',
  [OpportunityInterest.JUST_STACKING]: 'Just Stacking',
};

const FELLOWSHIP_LABELS: Record<FellowshipInterest, string> = {
  [FellowshipInterest.SILENT_PAYMENT_LIBRARY]: 'Silent Payment Library',
  [FellowshipInterest.SILENT_PAYMENT_INDEXER]: 'Silent Payment Indexer',
  [FellowshipInterest.COINSELECTION]: 'Coin Selection',
  [FellowshipInterest.BITCOIN_CORE_REVIEW]: 'Bitcoin Core Review',
  [FellowshipInterest.COINSWAP]: 'Coinswap',
  [FellowshipInterest.ANY_OTHER_PROJECT]: 'Any Other Project',
};

const ALL_COMPONENTS = Object.values(CohortComponent);
const ALL_RATINGS = Object.values(ComponentRating);
const ALL_OPPORTUNITIES = Object.values(OpportunityInterest);
const ALL_FELLOWSHIPS = Object.values(FellowshipInterest);

/* ── Bitcoin radio icon component ── */
const BitcoinRadio = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-10 h-10 flex items-center justify-center cursor-pointer bg-transparent border-0 transition-all duration-200"
    style={{
      color: checked ? '#f97316' : '#3f3f46',
      filter: checked ? 'drop-shadow(0 0 6px rgba(249,115,22,0.4))' : 'none',
    }}
  >
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-10 h-10 transition-transform duration-200"
      style={{ transform: checked ? 'scale(1.2)' : 'scale(1)' }}
    >
      <path d="M14.24 10.56C13.93 8.7 12.07 8.5 10.66 8.36l-.34-2.36-1.43.2.33 2.34-1.14.16-.34-2.34-1.43.2.34 2.35-2.88.4.22 1.55 1.04-.15a.65.65 0 0 1 .74.5l.87 6.13a.42.42 0 0 1-.34.49l-1.04.15.06 1.6 2.88-.4.34 2.35 1.43-.2-.34-2.35 1.14-.16.34 2.35 1.43-.2-.34-2.36c2.06-.37 3.48-1.18 3.2-3.17-.22-1.6-1.12-2.15-2.34-2.24.78-.5 1.16-1.3 1-2.49zm-1.72 4.84c.22 1.56-2.1 1.9-2.88 2.01l-.46-3.24c.78-.11 3.1-.45 3.34 1.23zm-.82-4.44c.2 1.42-1.74 1.7-2.4 1.8l-.42-2.94c.66-.1 2.6-.38 2.82 1.14z" />
    </svg>
  </button>
);

/* ── Checkbox component ── */
const Checkbox = ({ checked }: { checked: boolean; onClick: () => void }) => (
  <span
    className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
    style={{
      border: '1.5px solid',
      borderColor: checked ? '#f97316' : '#3f3f46',
      backgroundColor: checked ? '#f97316' : 'transparent',
    }}
  >
    {checked && (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )}
  </span>
);

/* ── Card wrapper matching profile design ── */
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl overflow-hidden ${className}`}
    style={{
      backgroundColor: '#0a0a0a',
      border: '1px solid #1a1a1a',
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div>
    <h3 className="text-base font-bold" style={{ color: '#fafafa' }}>{title}</h3>
    {subtitle && <p className="text-sm mt-1" style={{ color: '#71717a' }}>{subtitle}</p>}
  </div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-semibold mb-2" style={{ color: '#d4d4d8' }}>
    {children}
  </label>
);

const CohortFeedbackForm = ({ cohorts, isLoading, onSubmit, preselectedCohortId = '' }: Props) => {
  const navigate = useNavigate();
  const [selectedCohortId, setSelectedCohortId] = useState(preselectedCohortId);
  const [componentRatings, setComponentRatings] = useState<Partial<Record<CohortComponent, ComponentRating>>>({});
  const [expectations, setExpectations] = useState('');
  const [improvements, setImprovements] = useState('');
  const [opportunityInterests, setOpportunityInterests] = useState<OpportunityInterest[]>([]);
  const [fellowshipInterests, setFellowshipInterests] = useState<FellowshipInterest[]>([]);
  const [idealProject, setIdealProject] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (component: CohortComponent, rating: ComponentRating) => {
    setComponentRatings(prev => ({ ...prev, [component]: rating }));
  };

  const toggleOpportunity = (item: OpportunityInterest) => {
    setOpportunityInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item],
    );
  };

  const toggleFellowship = (item: FellowshipInterest) => {
    setFellowshipInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        cohortId: selectedCohortId,
        componentRatings,
        expectations,
        improvements,
        opportunityInterests,
        fellowshipInterests,
        idealProject,
        testimonial,
      });
      setSelectedCohortId('');
      setComponentRatings({});
      setExpectations('');
      setImprovements('');
      setOpportunityInterests([]);
      setFellowshipInterests([]);
      setIdealProject('');
      setTestimonial('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#111113',
    border: '1px solid #1e1e1e',
    borderRadius: '10px',
    color: '#fafafa',
    transition: 'border-color 200ms, box-shadow 200ms',
    width: '100%',
    boxSizing: 'border-box',
    display: 'block',
  };

  const inputFocusClass = 'px-4 py-3 outline-none text-sm resize-none placeholder-zinc-600';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ── Cohort Selector ── */}
      <Card className="p-5 sm:p-7">
        <SectionTitle
          title="Share Your Feedback"
          subtitle="Help us improve by sharing your thoughts about your cohort experience"
        />

        <div className="mt-5">
          <Label>Select Cohort <span style={{ color: '#ef4444' }}>*</span></Label>
          {isLoading ? (
            <div
              className="px-4 py-3 rounded-xl text-sm animate-pulse"
              style={{ backgroundColor: '#18181b', color: '#71717a' }}
            >
              Loading your cohorts...
            </div>
          ) : cohorts.length > 0 ? (
            <div className="relative">
              <select
                value={selectedCohortId}
                onChange={e => setSelectedCohortId(e.target.value)}
                className="w-full px-4 py-3 pr-10 outline-none text-sm cursor-pointer"
                style={{
                  backgroundColor: '#111113',
                  border: '1px solid #1e1e1e',
                  borderRadius: '10px',
                  color: '#fafafa',
                  width: '100%',
                  boxSizing: 'border-box',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  colorScheme: 'dark',
                }}
                required
              >
                <option value="" style={{ backgroundColor: '#18181b' }}>Choose a cohort...</option>
                {cohorts.map(cohort => (
                  <option key={cohort.id} value={cohort.id} style={{ backgroundColor: '#18181b' }}>
                    {cohort.type.replace(/_/g, ' ')} — Season {cohort.season}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: '#71717a' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          ) : (
            <div className="text-sm" style={{ color: '#71717a' }}>
              You are not enrolled in any cohorts.{' '}
              <button
                type="button"
                onClick={() => navigate('/myDashboard')}
                className="bg-transparent border-0 cursor-pointer hover:underline"
                style={{ color: '#f97316' }}
              >
                Join a cohort
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ── Component Ratings ── */}
      <Card className="p-5 sm:p-7">
        <SectionTitle
          title="Component Ratings"
          subtitle="How helpful were the following components?"
        />

        {/* Desktop table */}
        <div className="hidden md:block mt-5 overflow-x-auto">
          <table className="w-full" style={{ borderSpacing: '0 4px', borderCollapse: 'separate' }}>
            <thead>
              <tr>
                <th
                  className="text-left pb-3 pl-4 font-semibold text-xs uppercase tracking-wider"
                  style={{ color: '#52525b', width: '40%' }}
                >
                  Component
                </th>
                {ALL_RATINGS.map(rating => (
                  <th
                    key={rating}
                    className="pb-3 text-center font-semibold text-xs uppercase tracking-wider"
                    style={{ color: '#52525b' }}
                  >
                    {RATING_LABELS[rating]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_COMPONENTS.map((component, i) => (
                <tr
                  key={component}
                  style={{
                    backgroundColor: i % 2 === 0 ? '#111113' : 'transparent',
                  }}
                >
                  <td
                    className="py-3.5 pl-4 text-sm font-medium"
                    style={{
                      color: '#d4d4d8',
                      borderRadius: '10px 0 0 10px',
                    }}
                  >
                    {COMPONENT_LABELS[component]}
                  </td>
                  {ALL_RATINGS.map((rating, ri) => (
                    <td
                      key={rating}
                      className="py-3.5 text-center"
                      style={{
                        borderRadius: ri === ALL_RATINGS.length - 1 ? '0 10px 10px 0' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <BitcoinRadio
                          checked={componentRatings[component] === rating}
                          onClick={() => handleRatingChange(component, rating)}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stack */}
        <div className="md:hidden flex flex-col gap-4 mt-5">
          {ALL_COMPONENTS.map(component => (
            <div key={component}>
              <p className="text-sm font-medium mb-2" style={{ color: '#d4d4d8' }}>
                {COMPONENT_LABELS[component]}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_RATINGS.map(rating => {
                  const selected = componentRatings[component] === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRatingChange(component, rating)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 border-0"
                      style={{
                        backgroundColor: selected ? 'rgba(249,115,22,0.12)' : '#18181b',
                        border: `1px solid ${selected ? 'rgba(249,115,22,0.4)' : '#27272a'}`,
                        color: selected ? '#fb923c' : '#71717a',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 shrink-0"
                        style={{ color: selected ? '#f97316' : '#3f3f46' }}
                      >
                        <path d="M14.24 10.56C13.93 8.7 12.07 8.5 10.66 8.36l-.34-2.36-1.43.2.33 2.34-1.14.16-.34-2.34-1.43.2.34 2.35-2.88.4.22 1.55 1.04-.15a.65.65 0 0 1 .74.5l.87 6.13a.42.42 0 0 1-.34.49l-1.04.15.06 1.6 2.88-.4.34 2.35 1.43-.2-.34-2.35 1.14-.16.34 2.35 1.43-.2-.34-2.36c2.06-.37 3.48-1.18 3.2-3.17-.22-1.6-1.12-2.15-2.34-2.24.78-.5 1.16-1.3 1-2.49zm-1.72 4.84c.22 1.56-2.1 1.9-2.88 2.01l-.46-3.24c.78-.11 3.1-.45 3.34 1.23zm-.82-4.44c.2 1.42-1.74 1.7-2.4 1.8l-.42-2.94c.66-.1 2.6-.38 2.82 1.14z" />
                      </svg>
                      {RATING_LABELS[rating]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Open-ended questions ── */}
      <Card className="p-5 sm:p-7">
        <SectionTitle title="Your Experience" />

        <div className="flex flex-col gap-5 mt-5">
          <div>
            <Label>Did the cohort meet your expectations? What were they?</Label>
            <textarea
              value={expectations}
              onChange={e => setExpectations(e.target.value)}
              rows={3}
              className={inputFocusClass}
              style={inputStyle}
              placeholder="Share your expectations and whether they were met..."
            />
          </div>

          <div>
            <Label>What could we improve?</Label>
            <textarea
              value={improvements}
              onChange={e => setImprovements(e.target.value)}
              rows={3}
              className={inputFocusClass}
              style={inputStyle}
              placeholder="Suggest areas for improvement..."
            />
          </div>

          <div>
            <Label>What is your ideal Bitcoin project?</Label>
            <textarea
              value={idealProject}
              onChange={e => setIdealProject(e.target.value)}
              rows={3}
              className={inputFocusClass}
              style={inputStyle}
              placeholder="Describe the Bitcoin project you'd love to work on..."
            />
          </div>

          <div>
            <Label>Testimonial</Label>
            <textarea
              value={testimonial}
              onChange={e => setTestimonial(e.target.value)}
              rows={3}
              className={inputFocusClass}
              style={inputStyle}
              placeholder="Share a testimonial about your experience (may be featured publicly)..."
            />
          </div>
        </div>
      </Card>

      {/* ── Opportunity Interests ── */}
      <Card className="p-5 sm:p-7">
        <SectionTitle
          title="Opportunity Interests"
          subtitle="What opportunities are you interested in pursuing?"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
          {ALL_OPPORTUNITIES.map(item => {
            const selected = opportunityInterests.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleOpportunity(item)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 text-left border-0"
                style={{
                  backgroundColor: selected ? 'rgba(249,115,22,0.1)' : '#111113',
                  border: `1px solid ${selected ? 'rgba(249,115,22,0.3)' : '#1e1e1e'}`,
                  color: selected ? '#fb923c' : '#a1a1aa',
                }}
              >
                <Checkbox checked={selected} onClick={() => toggleOpportunity(item)} />
                <span className="text-sm font-medium">{OPPORTUNITY_LABELS[item]}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Fellowship Interests ── */}
      <Card className="p-5 sm:p-7">
        <SectionTitle
          title="Fellowship Interests"
          subtitle="Which fellowship projects interest you?"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
          {ALL_FELLOWSHIPS.map(item => {
            const selected = fellowshipInterests.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleFellowship(item)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 text-left border-0"
                style={{
                  backgroundColor: selected ? 'rgba(249,115,22,0.1)' : '#111113',
                  border: `1px solid ${selected ? 'rgba(249,115,22,0.3)' : '#1e1e1e'}`,
                  color: selected ? '#fb923c' : '#a1a1aa',
                }}
              >
                <Checkbox checked={selected} onClick={() => toggleFellowship(item)} />
                <span className="text-sm font-medium">{FELLOWSHIP_LABELS[item]}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Submit ── */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isSubmitting || !selectedCohortId}
          className="border-0 font-semibold px-8 py-3 rounded-xl cursor-pointer transition-all duration-200 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: '#ea580c',
            color: '#fff',
          }}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </div>
    </form>
  );
};

export default CohortFeedbackForm;
