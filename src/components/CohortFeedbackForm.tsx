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
  [CohortComponent.DEPUTY]: 'TA / Teaching Assistants',
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
  [OpportunityInterest.DESIGNER_CREATIVE]: 'Designer',
  [OpportunityInterest.EDUCATION_WRITING]: 'Educator',
  [OpportunityInterest.PROGRAM_OPS]: 'Program Ops',
  [OpportunityInterest.LEGAL_ACCOUNTS]: 'Legal / Accounts',
  [OpportunityInterest.BUILDING_STARTUP]: 'Building a Startup',
  [OpportunityInterest.HOSTING_CLUB]: 'Hosting a Club',
  [OpportunityInterest.JUST_STACKING]: 'Researcher',
};

const FELLOWSHIP_LABELS: Record<FellowshipInterest, string> = {
  [FellowshipInterest.SILENT_PAYMENT_LIBRARY]: 'Silent Payments Implementation',
  [FellowshipInterest.SILENT_PAYMENT_INDEXER]: 'Silent Payment Indexer',
  [FellowshipInterest.COINSELECTION]: 'Miniscript Security Audits',
  [FellowshipInterest.BITCOIN_CORE_REVIEW]: 'Bitcoin Core Review Group',
  [FellowshipInterest.COINSWAP]: 'Lightning Node Management Tools',
  [FellowshipInterest.ANY_OTHER_PROJECT]: 'Any Other Project',
};

// Show only the components visible in the design
const VISIBLE_COMPONENTS: CohortComponent[] = [
  CohortComponent.SESSION_INSTRUCTIONS,
  CohortComponent.STUDY_MATERIAL,
  CohortComponent.GROUP_DISCUSSIONS,
  CohortComponent.DEPUTY,
  CohortComponent.BITSHALA_CLUBS,
  CohortComponent.BITSPACE,
];

const ALL_RATINGS = Object.values(ComponentRating);
const ALL_OPPORTUNITIES = Object.values(OpportunityInterest);
const ALL_FELLOWSHIPS = Object.values(FellowshipInterest);

// Career pathways shown in the design
const CAREER_PATHWAYS: OpportunityInterest[] = [
  OpportunityInterest.DEVELOPER,
  OpportunityInterest.DESIGNER_CREATIVE,
  OpportunityInterest.JUST_STACKING,
  OpportunityInterest.EDUCATION_WRITING,
];

// Fellowship items shown in the design
const FELLOWSHIP_ITEMS: FellowshipInterest[] = [
  FellowshipInterest.SILENT_PAYMENT_LIBRARY,
  FellowshipInterest.BITCOIN_CORE_REVIEW,
  FellowshipInterest.COINSWAP,
  FellowshipInterest.COINSELECTION,
];

/* ── Section number label ── */
const SectionLabel = ({ number, label }: { number: string; label: string }) => (
  <p
    className="text-xs font-semibold tracking-[0.15em] uppercase mb-2"
    style={{ color: '#e97520' }}
  >
    {number} / {label}
  </p>
);

/* ── Radio dot ── */
const RadioDot = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-5 h-5 rounded-full cursor-pointer bg-transparent p-0 flex items-center justify-center transition-all duration-200"
    style={{
      border: `2px solid ${checked ? '#e97520' : '#444'}`,
      backgroundColor: checked ? '#e97520' : 'transparent',
    }}
  >
    {checked && (
      <span
        className="block w-2 h-2 rounded-full"
        style={{ backgroundColor: '#fff' }}
      />
    )}
  </button>
);

/* ── Checkbox ── */
const Checkbox = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-4 h-4 rounded-sm cursor-pointer bg-transparent p-0 flex items-center justify-center shrink-0 transition-all duration-200"
    style={{
      border: `1.5px solid ${checked ? '#e97520' : '#555'}`,
      backgroundColor: checked ? '#e97520' : 'transparent',
    }}
  >
    {checked && (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )}
  </button>
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

  const textareaStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#ccc',
    width: '100%',
    boxSizing: 'border-box',
    display: 'block',
    resize: 'none',
    fontFamily: 'Sora, sans-serif',
  };

  return (
    <form onSubmit={handleSubmit}>

      {/* ═══════════ 01 / SELECTION ═══════════ */}
      <div className="mb-20">
        <SectionLabel number="01" label="Selection" />
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#fff' }}>
              Target Cohort
            </h2>
            <p className="text-sm" style={{ color: '#666' }}>
              Select the specific learning track you completed.
            </p>
          </div>

          <div>
            <p
              className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5"
              style={{ color: '#888' }}
            >
              Cohort Season
            </p>
            {isLoading ? (
              <div
                className="px-4 py-2.5 rounded-lg text-sm animate-pulse"
                style={{ backgroundColor: '#1a1a1a', color: '#555', minWidth: 220 }}
              >
                Loading cohorts...
              </div>
            ) : cohorts.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedCohortId}
                  onChange={e => setSelectedCohortId(e.target.value)}
                  className="px-4 py-2.5 pr-8 outline-none text-sm cursor-pointer"
                  style={{
                    backgroundColor: '#222',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#ccc',
                    minWidth: 240,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    colorScheme: 'dark',
                    fontFamily: 'Sora, sans-serif',
                  }}
                  required
                >
                  <option value="" style={{ backgroundColor: '#222' }}>Choose a cohort...</option>
                  {cohorts.map(cohort => (
                    <option key={cohort.id} value={cohort.id} style={{ backgroundColor: '#222' }}>
                      {cohort.type.replace(/_/g, ' ')} — Season {cohort.season}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                  style={{ color: '#888' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            ) : (
              <div className="text-sm" style={{ color: '#666' }}>
                No cohorts found.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/myDashboard')}
                  className="bg-transparent border-0 cursor-pointer hover:underline"
                  style={{ color: '#e97520' }}
                >
                  Join a cohort
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ 02 / EVALUATION ═══════════ */}
      <div className="mb-20">
        <SectionLabel number="02" label="Evaluation" />
        <h2 className="text-2xl font-bold mb-8" style={{ color: '#fff' }}>
          Component Metrics
        </h2>

        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr>
                <th
                  className="text-left pb-4 pl-4 font-semibold text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: '#666', width: '35%' }}
                >
                  Session Type
                </th>
                {ALL_RATINGS.map(rating => (
                  <th
                    key={rating}
                    className="pb-4 text-center font-semibold text-[10px] uppercase tracking-[0.15em]"
                    style={{ color: '#666' }}
                  >
                    {RATING_LABELS[rating]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VISIBLE_COMPONENTS.map(component => (
                <tr key={component}>
                  <td
                    className="py-4 pl-4 text-sm font-medium"
                    style={{
                      color: '#bbb',
                      backgroundColor: '#1a1a1a',
                      borderRadius: '8px 0 0 8px',
                      borderTop: '1px solid #222',
                      borderBottom: '1px solid #222',
                      borderLeft: '1px solid #222',
                    }}
                  >
                    {COMPONENT_LABELS[component]}
                  </td>
                  {ALL_RATINGS.map((rating, ri) => (
                    <td
                      key={rating}
                      className="py-4 text-center"
                      style={{
                        backgroundColor: '#1a1a1a',
                        borderTop: '1px solid #222',
                        borderBottom: '1px solid #222',
                        borderRadius: ri === ALL_RATINGS.length - 1 ? '0 8px 8px 0' : undefined,
                        borderRight: ri === ALL_RATINGS.length - 1 ? '1px solid #222' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <RadioDot
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
        <div className="md:hidden flex flex-col gap-5">
          {VISIBLE_COMPONENTS.map(component => (
            <div key={component}>
              <p className="text-sm font-medium mb-2" style={{ color: '#bbb' }}>
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
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor: selected ? 'rgba(233,117,32,0.12)' : '#1a1a1a',
                        border: `1px solid ${selected ? 'rgba(233,117,32,0.4)' : '#2a2a2a'}`,
                        color: selected ? '#e97520' : '#666',
                      }}
                    >
                      <RadioDot checked={selected} onClick={() => handleRatingChange(component, rating)} />
                      {RATING_LABELS[rating]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ 03 / NARRATIVE ═══════════ */}
      <div className="mb-20">
        <SectionLabel number="03" label="Narrative" />
        <h2 className="text-2xl font-bold mb-8" style={{ color: '#fff' }}>
          Personal Experience
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
          <div>
            <label
              className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2"
              style={{ color: '#888' }}
            >
              Did the cohort meet your expectations?
            </label>
            <textarea
              value={expectations}
              onChange={e => setExpectations(e.target.value)}
              rows={5}
              className="px-4 py-3 outline-none text-sm placeholder-zinc-600"
              style={textareaStyle}
              placeholder="Share your honest assessment..."
            />
          </div>
          <div>
            <label
              className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2"
              style={{ color: '#888' }}
            >
              What is your ideal Bitcoin project?
            </label>
            <textarea
              value={idealProject}
              onChange={e => setIdealProject(e.target.value)}
              rows={5}
              className="px-4 py-3 outline-none text-sm placeholder-zinc-600"
              style={textareaStyle}
              placeholder="Describe your dream stack or tool..."
            />
          </div>
          <div>
            <label
              className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2"
              style={{ color: '#888' }}
            >
              What could we improve?
            </label>
            <textarea
              value={improvements}
              onChange={e => setImprovements(e.target.value)}
              rows={5}
              className="px-4 py-3 outline-none text-sm placeholder-zinc-600"
              style={textareaStyle}
              placeholder="Curriculum, delivery, timing..."
            />
          </div>
          <div>
            <label
              className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2"
              style={{ color: '#888' }}
            >
              Testimonial
            </label>
            <textarea
              value={testimonial}
              onChange={e => setTestimonial(e.target.value)}
              rows={5}
              className="px-4 py-3 outline-none text-sm placeholder-zinc-600"
              style={textareaStyle}
              placeholder="A short blurb for our community..."
            />
          </div>
        </div>
      </div>

      {/* ═══════════ 04 / FUTURE ═══════════ */}
      <div className="mb-20">
        <SectionLabel number="04" label="Future" />
        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#fff' }}>
          Fellowship &amp; Career
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          {/* Career Pathways */}
          <div>
            <h3
              className="text-sm font-semibold mb-3 pb-2"
              style={{ color: '#ccc', borderBottom: '1px solid #2a2a2a' }}
            >
              Career Pathways
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {CAREER_PATHWAYS.map(item => {
                const selected = opportunityInterests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleOpportunity(item)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-left"
                    style={{
                      backgroundColor: selected ? 'rgba(233,117,32,0.08)' : '#1a1a1a',
                      border: `1px solid ${selected ? 'rgba(233,117,32,0.3)' : '#2a2a2a'}`,
                      color: selected ? '#e97520' : '#999',
                    }}
                  >
                    <Checkbox checked={selected} onClick={() => toggleOpportunity(item)} />
                    <span className="text-sm font-medium">{OPPORTUNITY_LABELS[item]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fellowship Interest */}
          <div>
            <h3
              className="text-sm font-semibold mb-3 pb-2"
              style={{ color: '#ccc', borderBottom: '1px solid #2a2a2a' }}
            >
              Fellowship Interest
            </h3>
            <div className="flex flex-col gap-2">
              {FELLOWSHIP_ITEMS.map(item => {
                const selected = fellowshipInterests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleFellowship(item)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 text-left"
                    style={{
                      backgroundColor: selected ? 'rgba(233,117,32,0.08)' : '#1a1a1a',
                      border: `1px solid ${selected ? 'rgba(233,117,32,0.3)' : '#2a2a2a'}`,
                      color: selected ? '#e97520' : '#999',
                    }}
                  >
                    <span className="text-sm font-medium">{FELLOWSHIP_LABELS[item]}</span>
                    <Checkbox checked={selected} onClick={() => toggleFellowship(item)} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SUBMIT ═══════════ */}
      <div className="flex flex-col items-center gap-5 pt-6 pb-12">
        <p className="text-center text-xs" style={{ color: '#555', maxWidth: 400 }}>
          By submitting, you confirm that your feedback is constructive and intended
          for the betterment of the Bitshala community.
        </p>
        <button
          type="submit"
          disabled={isSubmitting || !selectedCohortId}
          className="border-0 font-semibold px-10 py-3 rounded-full cursor-pointer transition-all duration-200 text-sm tracking-[0.1em] uppercase outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: 'transparent',
            color: '#e97520',
            border: '1.5px solid #e97520',
          }}
          onMouseEnter={e => {
            if (!isSubmitting) {
              e.currentTarget.style.backgroundColor = '#e97520';
              e.currentTarget.style.color = '#fff';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#e97520';
          }}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
