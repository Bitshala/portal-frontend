import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { ArrowLeft } from 'lucide-react';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="h5"
    sx={{ fontWeight: 700, color: '#fb923c', mb: 2, fontSize: { xs: '1.4rem', sm: '1.65rem' } }}
  >
    {children}
  </Typography>
);

const SubTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontWeight: 600, color: '#fafafa', mb: 1, fontSize: '1.1rem' }}>
    {children}
  </Typography>
);

const Paragraph = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: '#d4d4d8', fontSize: '1rem', lineHeight: 1.8 }}>
    {children}
  </Typography>
);

const Highlight = ({ children, color = '#fb923c' }: { children: React.ReactNode; color?: string }) => (
  <Box component="span" sx={{ color, fontWeight: 600 }}>
    {children}
  </Box>
);

const BulletItem = ({ children, color = '#fb923c' }: { children: React.ReactNode; color?: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
    <Typography sx={{ color, fontSize: '1rem', lineHeight: 1.8, flexShrink: 0 }}>•</Typography>
    <Typography sx={{ color: '#d4d4d8', fontSize: '1rem', lineHeight: 1.8 }}>{children}</Typography>
  </Box>
);

// The General Instructions page is intentionally hard-coded: its rich inline
// formatting (per-phrase colors, bold, colored bullets, callouts) cannot be
// expressed in the plain-string API content, so the page is kept in the UI.
const GeneralInstructions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa' }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4, md: 6 }, py: { xs: 3, sm: 5 } }}>
        {/* Back button */}
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{
            color: '#a1a1aa',
            textTransform: 'none',
            fontWeight: 500,
            mb: 4,
            px: 1.5,
            '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          Back
        </Button>

        {/* Header */}
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#fb923c',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem' },
            }}
          >
            Welcome to Bitshala Cohort
          </Typography>
          <Typography sx={{ color: '#a1a1aa', fontSize: '1.1rem', lineHeight: 1.7 }}>
            These general instructions are aimed at helping you navigate through the program successfully.
          </Typography>
        </Box>

        {/* Sections */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Introduction Session */}
          <Box>
            <SectionTitle>Introduction Session</SectionTitle>
            <Paragraph>
              The program begins with an introductory session. This is an ice-breaker between participants and the Bitshala team where we share what to expect in the coming <Highlight>8 weeks</Highlight>. It would be a great place to introduce oneself, get to know each other, and discuss the course structure. We will also have an intro session by Bitshala Team on <Highlight>Bitcoin dev career</Highlight>!
            </Paragraph>
          </Box>

          {/* Communication & Attendance */}
          <Box>
            <SectionTitle>Communication & Attendance</SectionTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paragraph>
                <Highlight color="#60a5fa">Discord</Highlight> will be the primary means of communication. We will host all our sessions, discussions and doubt clearing on Discord, every week at the same time and same day. This will also be visible over your google calendar. Participants are expected to attend every week. We allow <Highlight color="#4ade80">one absence</Highlight> for emergencies or previous conflicts. If you miss more than <Highlight color="#f87171">2 meetings</Highlight>, we advise you to re-join the next cohort. We do it every 2 months i.e. 8 weeks.
              </Paragraph>
              <Paragraph>
                To begin with please introduce yourself at Bitshala Discord (in the <Highlight color="#60a5fa">#Intro channel</Highlight>). Say a little bit about yourself, what you do for work and something you do for fun. These groups work best when we get to know each other. If you don't want to use your personal photo as your icon, that is totally fine. Just please change it to a unique image.
              </Paragraph>
            </Box>
          </Box>

          {/* Overview */}
          <Box>
            <SectionTitle>Overview of the Study Cohort</SectionTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <SubTitle>Duration</SubTitle>
                <Paragraph>Weekly sessions.</Paragraph>
              </Box>

              <Box>
                <SubTitle>Registered Participants</SubTitle>
                <Box sx={{ pl: 1 }}>
                  <BulletItem>Registered participants will be enrolled</BulletItem>
                  <BulletItem>Participants will be provided with weekly question sets</BulletItem>
                  <BulletItem>They are required to prepare by reading designated chapters and completing any practice examples in the book</BulletItem>
                </Box>
              </Box>

              <Box>
                <SubTitle>Open Participation</SubTitle>
                <Box sx={{ pl: 1 }}>
                  <BulletItem>Non-registered participants are welcome to attend and benefit from the discussions but will not be profiled or receive certificates.</BulletItem>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Session Structure */}
          <Box>
            <SectionTitle>Session Structure</SectionTitle>
            <SubTitle>60-Minute Group Discussion</SubTitle>
            <Box sx={{ pl: 1 }}>
              <BulletItem color="#4ade80">All the participants will show up in one voice channel with the Teaching Assistants (TAs)</BulletItem>
              <BulletItem color="#60a5fa">Questions will be allocated to participants within each group, with priority given to registered participants</BulletItem>
              <BulletItem color="#a78bfa">TAs will facilitate the discussion, assess answers, and provide feedback</BulletItem>
              <BulletItem color="#fb923c">Participants can seek clarification on concepts and exercises from the chapter</BulletItem>
            </Box>
          </Box>

          {/* Group Assignments */}
          <Box>
            <SectionTitle>Group Assignments</SectionTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paragraph>
                Each week, your attendance is tracked and directly affects your group assignment for the following week.
              </Paragraph>

              <Box>
                <SubTitle>How It Works</SubTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 1 }}>
                  <BulletItem color="#4ade80">
                    <Highlight color="#4ade80">Attendance Tracking</Highlight> — Every week, if you attend you are marked <Highlight color="#4ade80">Present</Highlight>. If you do not attend, you are marked <Highlight color="#f87171">Absent</Highlight>.
                  </BulletItem>
                  <BulletItem color="#60a5fa">
                    <Highlight color="#60a5fa">Group Assignment</Highlight> — Based on the previous week's attendance, TAs assign present participants into groups using our custom grouping logic.
                  </BulletItem>
                  <BulletItem color="#f87171">
                    <Highlight color="#f87171">Group 0 (Unassigned)</Highlight> — Absent participants are placed into <Highlight color="#f87171">Group 0</Highlight> by default. They are free to join any group TAs assign them to, but they <Highlight>must notify the TAs</Highlight>.
                  </BulletItem>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: 'rgba(249,115,22,0.06)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 2,
                  px: 3,
                  py: 2,
                }}
              >
                <Paragraph>
                  <Highlight>Tip:</Highlight> Consistent attendance ensures you are automatically placed in a group each week without extra steps. If you were absent last week and plan to attend, <Highlight>reach out to a TA</Highlight> ahead of time so they can place you in a group.
                </Paragraph>
              </Box>
            </Box>
          </Box>

          {/* Participant Profiling */}
          <Box>
            <SectionTitle>Participant Profiling and Evaluation</SectionTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <SubTitle>Grading</SubTitle>
                <Paragraph>Participants will be evaluated by TAs based on their answers and demonstrated technical competency.</Paragraph>
              </Box>

              <Box>
                <SubTitle>Performance Profiling</SubTitle>
                <Box sx={{ pl: 1 }}>
                  <BulletItem color="#4ade80">Profiles will include strengths, areas for improvement, and overall progress.</BulletItem>
                  <BulletItem color="#60a5fa">These profiles will serve as feedback for the participants and guide TAs in providing targeted support.</BulletItem>
                </Box>
              </Box>

              <Box>
                <SubTitle>Completion Certificate</SubTitle>
                <Paragraph>
                  Certificates will be awarded to <Highlight color="#4ade80">registered participants</Highlight> who actively participate and perform satisfactorily throughout the cohort.
                </Paragraph>
              </Box>
            </Box>
          </Box>

          {/* Open Participation Policy */}
          <Box>
            <SectionTitle>Open Participation Policy</SectionTitle>
            <Box sx={{ pl: 1 }}>
              <BulletItem color="#4ade80">Non-registered participants are encouraged to join and benefit from the discussions.</BulletItem>
              <BulletItem color="#f87171">However, they will not be profiled, graded, or eligible for completion certificates.</BulletItem>
              <BulletItem color="#60a5fa">Priority to answer questions will be given to registered participants.</BulletItem>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default GeneralInstructions;
