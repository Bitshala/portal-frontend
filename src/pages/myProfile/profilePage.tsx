import React, { useState } from 'react';

interface FormInputProps {
  label: string;
  id: string;
  value: string | null;
  type?: string;
  isTextarea?: boolean;
}

interface FormInputsProps {
  inputs: FormInputProps[];
  isEditing: boolean;
  onChange: (id: string, value: string) => void;
}

const FormInputs: React.FC<FormInputsProps> = ({ inputs, isEditing, onChange }) => {
  return (
    <div className='grid grid-cols-2'>
      {inputs.map((input) => (
        <div key={input.id} className={`flex flex-col gap-2 mb-4 px-4 ${input.isTextarea ? 'col-span-2' : ''}`}>
          <label htmlFor={input.id}>{input.label}</label>
          {input.isTextarea ? (
            <textarea
              className={`border-none text-white px-2 py-2 rounded-md resize-none focus:outline-none ${isEditing ? 'bg-orange-600' : 'bg-gray-600'}`}
              id={input.id}
              value={input.value || ''}
              readOnly={!isEditing}
              rows={3}
              onChange={(e) => onChange(input.id, e.target.value)}
            />
          ) : (
            <input
              type={input.type || "text"}
              className={`h-10 border-none text-white focus:outline-none px-2 rounded-md ${isEditing ? 'bg-orange-600' : 'bg-gray-600'}`}
              id={input.id}
              value={input.value || ''}
              readOnly={!isEditing}
              onChange={(e) => onChange(input.id, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  interface Profile {
    id: string;
    email: string;
    discordUsername: string;
    discordGlobalName: string;
    name: string | null;
    role: string;
    description: string | null;
    background: string | null;
    githubProfileUrl: string | null;
    portfolioUrl: string | null;
    linkedinProfileUrl: string | null;
    skills: string[];
    firstHeardAboutBitcoinOn: string | null;
    bitcoinBooksRead: string[];
    whyBitcoin: string | null;
    weeklyCohortCommitmentHours: number | null;
    location: string | null;
  }

  const [profile, setProfile] = useState<Profile>({
    id: "",
    email: "",
    discordUsername: "",
    discordGlobalName: "",
    name: null,
    role: "",
    description: null,
    background: null,
    githubProfileUrl: null,
    portfolioUrl: null,
    linkedinProfileUrl: null,
    skills: [],
    firstHeardAboutBitcoinOn: null,
    bitcoinBooksRead: [],
    whyBitcoin: null,
    weeklyCohortCommitmentHours: null,
    location: null
  });

  const profileInputs: FormInputProps[] = [
    { label: "Email", id: "email", value: profile.email, type: "email" },
    { label: "Discord Username", id: "discordUsername", value: profile.discordUsername },
    { label: "Discord Display Name", id: "discordGlobalName", value: profile.discordGlobalName },
    { label: "Name", id: "name", value: profile.name },
    { label: "Role", id: "role", value: profile.role },
    { label: "GitHub", id: "githubProfileUrl", value: profile.githubProfileUrl, type: "url" },
    { label: "Portfolio / Side Project", id: "portfolioUrl", value: profile.portfolioUrl, type: "url" },
    { label: "LinkedIn", id: "linkedinProfileUrl", value: profile.linkedinProfileUrl, type: "url" },
    { label: "Location", id: "location", value: profile.location },
    { label: "First Heard Bitcoin On", id: "firstHeardAboutBitcoinOn", value: profile.firstHeardAboutBitcoinOn },
    { label: "Why Bitcoin", id: "whyBitcoin", value: profile.whyBitcoin },
    { label: "Weekly Hours", id: "weeklyCohortCommitmentHours", value: profile.weeklyCohortCommitmentHours?.toString() || null, type: "number" },
    { label: "Description", id: "description", value: profile.description, isTextarea: true },
    { label: "Background", id: "background", value: profile.background, isTextarea: true }
  ];

  const handleChange = (id: string, value: string) => {
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const toggleEdit = () => setIsEditing(!isEditing);

  return (
    <div>
      <div className="min-h-screen bg-zinc-900 text-zinc-100 px-8 py-6" style={{ fontFamily: 'Sora, sans-serif' }}>
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold mx-4">My Profile</h1>
          <button
            onClick={toggleEdit}
            className="bg-orange-600 mx-4 hover:bg-orange-700 px-4 py-2 border-none rounded-md transition-colors"
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
        </header>

        <FormInputs inputs={profileInputs} isEditing={isEditing} onChange={handleChange} />
      </div>
    </div>
  );
};

export default ProfilePage;