import React, { useState, useEffect, useRef } from 'react';
import {
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Slider,
  Box,
  Button,
  Chip,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
  createThirdwebClient,
} from 'thirdweb';
import { getDiamondAddress } from '../primitives/Diamond';
import { useActiveWallet } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { SelectChangeEvent } from '@mui/material/Select';
import { MusicNote as MusicNoteIcon, Lock as LockIcon, Add as AddIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import TagIcon from '@mui/icons-material/Tag';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
// Browser-safe Thirdweb client getter (fetches clientId from API)
let mythologyClientCache: any | null = null;
async function getThirdwebBrowserClient() {
  if (mythologyClientCache) return mythologyClientCache;
  const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
  const { clientId } = await resp.json();
  if (!clientId) throw new Error('Thirdweb client is not configured');
  mythologyClientCache = createThirdwebClient({ clientId });
  return mythologyClientCache;
}

// Define your sound options (colors unused in noir mode but preserved for structure)
const soundOptions = [
  { label: 'Classic Typewriter', src: '/classictypewriter.wav', color: '#e5e5e5', hoverText: 'Classic Typewriter' },
  { label: 'ASMR Keyboard', src: '/ASMRkeyboard.mp3', color: '#d4d4d4', hoverText: 'ASMR Click Keys' },
  { label: 'Ceramic Keyboard', src: '/ceramickeyboard.mp3', color: '#a3a3a3', hoverText: 'Sharp Ceramic Keys' },
  { label: 'Bamboo Keyboard', src: '/bambookeyboard.mp3', color: '#7a7a7a', hoverText: 'Natural Bamboo Keys' },
];

// Define your font options using system default fonts
const fontOptions = [
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Cursive', value: 'cursive' },
];

// Noir grayscale accents
const accentColor = '#bfbfbf';
const neonGreen = '#e0e0e0';

// Container styled component with dynamic top based on isMobile prop
const Container = styled('div')<{ isMobile: boolean }>(({ theme, isMobile }) => ({
  backgroundColor: '#0D0D0D',
  top: '0vh',
  maxHeight: '100vh',
  minHeight: '100vh',
  height: '100vh',
  marginBottom: '10vh',
  padding: theme.spacing(2),
  color: '#FFFFFF',
  position: 'relative',
  overflow: 'hidden', // To contain particle background
  display: 'flex',
  flexDirection: 'column',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  backgroundColor: 'rgba(20, 20, 20, 0.8)',
  borderRadius: '12px',
  marginBottom: theme.spacing(2),
  '& .MuiTabs-indicator': {
    backgroundColor: accentColor,
  },
  zIndex: 2,
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  minWidth: 80,
  fontWeight: theme.typography.fontWeightRegular,
  color: '#FFFFFF',
  '&.Mui-selected': {
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeightBold,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
}));

const ContentArea = styled(Box)<{ fontFamily: string }>(({ theme, fontFamily }) => ({
  borderRadius: '12px',
  padding: theme.spacing(2),
  flexGrow: 1,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  marginLeft: '1%',
  marginRight: '1%',
  width: '98%',
  fontFamily: fontFamily,
  lineHeight: 1.5,
  fontSize: '1rem',
  color: '#F3F6FF',
  marginTop: theme.spacing(2),
  border: '1px solid rgba(255, 255, 255, 0.18)',
  background: 'rgba(18, 18, 18, 0.5)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: `0 0 18px rgba(255,255,255,0.2)`,
  zIndex: 2,
  '& p': {
    textIndent: '1.5em',
    marginBottom: '1em',
  },
}));

const SelectionControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  alignItems: 'center',
  zIndex: 2,
}));

const ThemeControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  zIndex: 2,
}));

// Styled Accordion with Cyberpunk Theme
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  backgroundColor: 'rgba(30, 30, 30, 0.45)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: `1px solid rgba(255,255,255,0.18)`,
  borderRadius: '8px',
  marginLeft: '1%',
  marginRight: '1%',
  width: '98%',
  marginBottom: '1%',
  boxShadow: `0 0 14px rgba(255,255,255,0.2)`,
  color: '#E0E0E0',
  '&:before': {
    display: 'none',
  },
  '& .MuiAccordionSummary-root': {
    padding: theme.spacing(1),
  },
  '& .MuiAccordionSummary-expandIconWrapper': {
    color: '#E0E0E0',
  },
  '& .MuiAccordionSummary-content': {
    marginLeft: theme.spacing(1),
  },
  '&.Mui-expanded': {
    margin: 'auto',
  },
  transition: 'background-color 0.3s, box-shadow 0.3s',
}));

// Styled Image with Cyberpunk Aesthetics
const StyledImage = styled('img')(({ theme }) => ({
  width: '100%',
  maxHeight: '400px',
  objectFit: 'contain',
  borderRadius: '8px',
  boxShadow: `0 0 20px rgba(255,255,255,0.25)`,
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: `0 0 30px rgba(255,255,255,0.35)`,
  },
}));

// Cover image for the default reader view (no glow/shadow/hover)
const CoverImage = styled('img')(({ theme }) => ({
  width: '100%',
  height: 'auto',
  maxHeight: '340px',
  objectFit: 'contain',
  borderRadius: '8px',
}));

const ColorOption = styled('div')<{ color: string; selected: boolean }>(
  ({ color, selected }) => ({
    backgroundColor: color,
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: selected ? `2px solid #ffffff` : '1px solid #ccc',
    cursor: 'pointer',
    transition: 'transform 0.2s, border 0.2s',
    '&:hover': {
      transform: 'scale(1.2)',
    },
  })
);

const StyledSelectComponent = styled(Select)(({ theme }) => ({
  color: '#FFFFFF',
  backgroundColor: 'rgba(30, 30, 30, 0.8)',
  borderRadius: '8px',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.35)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ffffff',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ffffff',
  },
  minWidth: '120px',
}));

const StyledSliderComponent = styled(Slider)(({ theme }) => ({
  color: '#e0e0e0',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    color: '#F3F6FF',
    fontFamily: 'inherit',
  },
  '& .MuiInputBase-input': {
    color: '#F3F6FF',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.35)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ffffff',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ffffff',
  },
  '& label': {
    color: '#FFFFFF',
  },
  '& label.Mui-focused': {
    color: '#FFFFFF',
  },
  borderRadius: '8px',
  marginBottom: '10px',
  width: '100%',
  fontFamily: 'inherit',
}));

const MediaPreview = styled('div')(({ theme }) => ({
  marginTop: theme.spacing(2),
  textAlign: 'center',
  '& img': {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
    boxShadow: `0 0 10px rgba(255,255,255,0.25)`,
  },
}));

// Styled Components with adjustments
const MediaPreviewContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginTop: theme.spacing(1),
}));

const PreviewImage = styled('img')(({ theme }) => ({
  maxWidth: '100%',
  maxHeight: '300px', // Restrict image height
  borderRadius: '8px',
  boxShadow: `0 0 10px rgba(255,255,255,0.25)`,
  objectFit: 'contain',
}));

const PlaceholderText = styled(Typography)(({ theme }) => ({
  color: '#AAAAAA',
  fontStyle: 'italic',
  textAlign: 'center',
  marginTop: theme.spacing(2),
}));

const PublisherContainer = styled(Box)(({ theme }) => ({
  overflowY: 'auto', // Make the write section scrollable
  maxHeight: '80vh', // Adjust as needed
  paddingRight: theme.spacing(1),
}));

// Reusable glass card wrapper
const GlassCard = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  background: 'rgba(25, 25, 25, 0.45)',
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: `0 8px 28px rgba(255,255,255,0.12)`,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  padding: theme.spacing(2),
}));

// Glassy toolbar container
const Ribbon = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(1),
  background: 'rgba(30, 30, 30, 0.5)',
  border: '1px solid rgba(255,255,255,0.16)',
  boxShadow: `0 6px 20px rgba(255,255,255,0.14)`,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
}));

// Define background and text colors
type BackgroundType = 'dark' | 'light' | 'sepia';

const backgroundColors: Record<BackgroundType, string> = {
  dark: 'rgba(20, 20, 20, 0.8)',
  light: 'rgba(245, 245, 245, 0.8)',
  sepia: 'rgba(210, 210, 210, 0.8)',
};

const textColors: Record<string, string> = {
  white: '#FFFFFF',
  black: '#000000',
  gray: '#808080',
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
};

// Utility function to truncate text
const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Complete ABI (as provided)
const abi: any = [
  {
    "inputs": [],
    "name": "EnumerableSet__IndexOutOfBounds",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "chapterId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      }
    ],
    "name": "ChapterCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "chapterId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "sectionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "author",
        "type": "address"
      }
    ],
    "name": "SectionPublished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "sectionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "author",
        "type": "address"
      }
    ],
    "name": "SectionUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      }
    ],
    "name": "StoryCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      }
    ],
    "name": "createChapter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      }
    ],
    "name": "createStory",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllStories",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          }
        ],
        "internalType": "struct TheMythology.Story[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "chapterId",
        "type": "uint256"
      }
    ],
    "name": "getChapter",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          }
        ],
        "internalType": "struct TheMythology.Chapter",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "chapterId",
        "type": "uint256"
      }
    ],
    "name": "getChapterSections",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "body",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "mediaURI",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timePublished",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "author",
            "type": "address"
          },
          {
            "internalType": "string[]",
            "name": "sources",
            "type": "string[]"
          },
          {
            "internalType": "string[]",
            "name": "keywords",
            "type": "string[]"
          }
        ],
        "internalType": "struct TheMythology.Section[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "sectionId",
        "type": "uint256"
      }
    ],
    "name": "getSection",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "body",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "mediaURI",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timePublished",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "author",
            "type": "address"
          },
          {
            "internalType": "string[]",
            "name": "sources",
            "type": "string[]"
          },
          {
            "internalType": "string[]",
            "name": "keywords",
            "type": "string[]"
          }
        ],
        "internalType": "struct TheMythology.Section",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      }
    ],
    "name": "getStory",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          }
        ],
        "internalType": "struct TheMythology.Story",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      }
    ],
    "name": "getStoryChapters",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          }
        ],
        "internalType": "struct TheMythology.Chapter[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      }
    ],
    "name": "getStorySections",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "body",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "mediaURI",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timePublished",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "author",
            "type": "address"
          },
          {
            "internalType": "string[]",
            "name": "sources",
            "type": "string[]"
          },
          {
            "internalType": "string[]",
            "name": "keywords",
            "type": "string[]"
          }
        ],
        "internalType": "struct TheMythology.Section[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "storyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "chapterId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "body",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "mediaURI",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "sources",
        "type": "string[]"
      },
      {
        "internalType": "string[]",
        "name": "keywords",
        "type": "string[]"
      }
    ],
    "name": "publishSection",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "role",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "ieHasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "sectionId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "body",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "mediaURI",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "sources",
        "type": "string[]"
      },
      {
        "internalType": "string[]",
        "name": "keywords",
        "type": "string[]"
      }
    ],
    "name": "updateSection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const Mythology = () => {
  let contractAddressCache: string | null = null;
  const getAddress = async () => {
    if (contractAddressCache) return contractAddressCache;
    contractAddressCache = await getDiamondAddress();
    return contractAddressCache;
  };

  // Validate environmental variables
  useEffect(() => {
    (async () => {
      try {
        await getAddress();
      } catch (e) {
        console.error('Diamond address not configured.');
      }
    })();
  }, []);

  const [activeTab, setActiveTab] = useState('viewer');
  const [hasPublisherRole, setHasPublisherRole] = useState<boolean>(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const devPublisher = process.env.NEXT_PUBLIC_PUBLISHER_DEV === 'true';
  const canPublish = hasPublisherRole || devPublisher;
  const demoEnabled = process.env.NEXT_PUBLIC_MYTHOLOGY_DEMO === 'true';

  const [stories, setStories] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedStory, setSelectedStory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Write Tab State Variables
  const [selectedWriteStory, setSelectedWriteStory] = useState('');
  const [writeChapters, setWriteChapters] = useState<any[]>([]);
  const [selectedWriteChapter, setSelectedWriteChapter] = useState('');
  const [writeSections, setWriteSections] = useState<any[]>([]);
  const [selectedWriteSection, setSelectedWriteSection] = useState('');

  const [content, setContent] = useState('');
  const [mediaURI, setMediaURI] = useState(''); // For Read Tab
  const [viewerMeta, setViewerMeta] = useState({ title: '', sources: [] as string[], keywords: [] as string[] });

  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');

  const [newSectionData, setNewSectionData] = useState({
    title: '',
    body: '',
    mediaURI: '',
    sources: [] as string[],
    keywords: [] as string[],
  });

  const [inputSource, setInputSource] = useState('');
  const [inputKeyword, setInputKeyword] = useState('');

  const [typingSound, setTypingSound] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundThrottleRef = useRef<number | null>(null);

  const wallet = useActiveWallet()?.getAccount() as any;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [navOpen, setNavOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const keywordInputRef = useRef<HTMLInputElement | null>(null);
  const scrollToRef = (el?: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
  };

  // State for modals
  const [openAddStory, setOpenAddStory] = useState(false);
  const [openAddChapter, setOpenAddChapter] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // State for media preview in publish section
  const [mediaPreview, setMediaPreview] = useState<string>('');

  // State for background
  const [selectedBackground, setSelectedBackground] = useState<BackgroundType>('dark');

  // Helper Variables to Get Current Titles
  const currentStory = stories.find(story => story.id.toString() === selectedStory);
  const currentChapter = chapters.find(chapter => chapter.id.toString() === selectedChapter);
  const currentSection = sections.find(section => section.id.toString() === selectedSection);

  // Helpers for sidebar selection (retain functionality)
  const selectStory = async (id: string) => {
    setSelectedStory(id);
    setSelectedChapter('');
    setSelectedSection('');
    setContent('');
    setSections([]);
    // Handle demo story locally
    if (id === 'demo') {
      setChapters(demoChapters);
      setSelectedChapter('demo-1');
      setSections(demoSections);
      setSelectedSection('demo-1-1');
      setContent(demoSections[0].body);
      setMediaURI(demoSections[0].mediaURI);
      setViewerMeta({ title: demoSections[0].title || '', sources: demoSections[0].sources || [], keywords: demoSections[0].keywords || [] });
      return;
    }
    await fetchChapters(id);
  };

  const selectChapter = async (id: string) => {
    setSelectedChapter(id);
    setSelectedSection('');
    setContent('');
    setSections([]);
    // Handle demo chapter locally
    if (selectedStory === 'demo' || id.startsWith('demo')) {
      setSections(demoSections);
      setSelectedSection('demo-1-1');
      setContent(demoSections[0].body);
      setMediaURI(demoSections[0].mediaURI);
      setViewerMeta({ title: demoSections[0].title || '', sources: demoSections[0].sources || [], keywords: demoSections[0].keywords || [] });
      return;
    }
    await fetchSections(id);
  };

  const selectSection = (id: string) => {
    setSelectedSection(id);
    const sec = (selectedStory === 'demo' || id.startsWith('demo'))
      ? demoSections.find((s: any) => s.id.toString() === id)
      : sections.find((s) => s.id.toString() === id);
    if (sec) {
      setContent(sec.body);
      setMediaURI(sec.mediaURI);
      setViewerMeta({ title: sec.title || '', sources: sec.sources || [], keywords: sec.keywords || [] });
    } else {
      setContent('');
      setMediaURI('');
      setViewerMeta({ title: '', sources: [], keywords: [] });
    }
  };

  const restoringDraftRef = useRef(false);
  useEffect(() => {
    try {
      restoringDraftRef.current = Boolean(localStorage.getItem(draftKey));
    } catch { restoringDraftRef.current = false; }
    fetchStories(restoringDraftRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize audio context and play sound
  const playTypingSound = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (!soundThrottleRef.current && typingSound) {
      try {
        const audioBuffer = await fetch(typingSound)
          .then((response) => response.arrayBuffer())
          .then((buffer) => audioContextRef.current!.decodeAudioData(buffer));

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);

        source.stop(audioContextRef.current.currentTime + 0.5); // 50ms

        soundThrottleRef.current = window.setTimeout(() => {
          soundThrottleRef.current = null;
        }, 50); // Throttle the sound
      } catch (error) {
        console.error('Error playing typing sound:', error);
      }
    }
  };

  const handleTyping = () => {
    if (typingSound) {
      playTypingSound();
    }
  };

  const handleSoundSelection = (sound: string) => {
    if (typingSound === sound) {
      setTypingSound(null);
    } else {
      setTypingSound(sound);
    }
  };

  const fetchStories = async (suppressPopulate?: boolean) => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const result = await readContract({
        contract,
        method: 'getAllStories',
        params: [],
      });

      // If no on-chain stories and demo is enabled, always show demo in library
      if (result.length === 0 && demoEnabled) {
        setStories([demoStory]);
        if (!suppressPopulate) {
          setSelectedStory('demo');
          setChapters(demoChapters);
          setSelectedChapter('demo-1');
          setSections(demoSections);
          setSelectedSection('demo-1-1');
          setContent(demoSections[0].body);
          setMediaURI(demoSections[0].mediaURI);
          setViewerMeta({ title: demoSections[0].title || '', sources: demoSections[0].sources || [], keywords: demoSections[0].keywords || [] });
        }
        return;
      }

      setStories(result);
      if (!suppressPopulate && result.length > 0) {
        setSelectedStory(result[0].id.toString());
        fetchChapters(result[0].id.toString());
        setSelectedWriteStory(result[0].id.toString());
        fetchWriteChapters(result[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const fetchChapters = async (storyId: string) => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const result = await readContract({
        contract,
        method: 'getStoryChapters',
        params: [Number(storyId)],
      });

      setChapters(result);
      if (result.length > 0) {
        setSelectedChapter(result[0].id.toString());
        fetchSections(result[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchSections = async (chapterId: string) => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const result = await readContract({
        contract,
        method: 'getChapterSections',
        params: [Number(chapterId)],
      });

      setSections(result);
      if (result.length > 0) {
        setSelectedSection(result[0].id.toString());
        const section = result[0];
        setContent(section.body);
        setMediaURI(section.mediaURI);
        setViewerMeta({ title: section.title || '', sources: section.sources || [], keywords: section.keywords || [] });
      } else {
        setContent('');
        setMediaURI('');
        setViewerMeta({ title: '', sources: [], keywords: [] });
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Write Tab Fetch Functions
  const fetchWriteChapters = async (storyId: string, suppressPopulate?: boolean) => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const result = await readContract({
        contract,
        method: 'getStoryChapters',
        params: [Number(storyId)],
      });

      setWriteChapters(result);
      if (suppressPopulate) return;
      if (result.length > 0) {
        setSelectedWriteChapter(result[0].id.toString());
        fetchWriteSections(result[0].id.toString());
      } else {
        setWriteSections([]);
        setSelectedWriteChapter('');
      }
    } catch (error) {
      console.error('Error fetching write chapters:', error);
    }
  };

  const fetchWriteSections = async (chapterId: string, suppressPopulate?: boolean) => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const result = await readContract({
        contract,
        method: 'getChapterSections',
        params: [Number(chapterId)],
      });

      setWriteSections(result);
      if (suppressPopulate) return;
      if (result.length > 0) {
        setSelectedWriteSection(result[0].id.toString());
        const section = result[0];
        setNewSectionData({
          title: section.title,
          body: section.body,
          mediaURI: section.mediaURI,
          sources: section.sources,
          keywords: section.keywords,
        });
        setMediaPreview(section.mediaURI);
      } else {
        setSelectedWriteSection('');
        setNewSectionData({
          title: '',
          body: '',
          mediaURI: '',
          sources: [],
          keywords: [],
        });
        setMediaPreview('');
      }
    } catch (error) {
      console.error('Error fetching write sections:', error);
    }
  };

  const handleStoryChange = (
    event: SelectChangeEvent<unknown>,
    child: React.ReactNode
  ) => {
    const storyId = event.target.value as string;
    setSelectedStory(storyId);
    setSelectedChapter('');
    setSelectedSection('');
    setContent('');
    setSections([]);
    fetchChapters(storyId);
  };

  const handleChapterChange = (
    event: SelectChangeEvent<unknown>,
    child: React.ReactNode
  ) => {
    const chapterId = event.target.value as string;
    setSelectedChapter(chapterId);
    setSelectedSection('');
    setContent('');
    setSections([]);
    fetchSections(chapterId);
  };

  const handleSectionChange = (
    event: SelectChangeEvent<unknown>,
    child: React.ReactNode
  ) => {
    const sectionId = event.target.value as string;
    setSelectedSection(sectionId);
    const section = sections.find(
      (sec) => sec.id.toString() === sectionId
    );
    if (section) {
      setContent(section.body);
      setMediaURI(section.mediaURI);
      setViewerMeta({ title: section.title || '', sources: section.sources || [], keywords: section.keywords || [] });
    } else {
      setContent('');
      setMediaURI('');
      setViewerMeta({ title: '', sources: [], keywords: [] });
    }
  };

  // Write Tab Handle Functions
  const handleWriteStoryChange = (
    event: SelectChangeEvent<unknown>,
    child: React.ReactNode
  ) => {
    const storyId = event.target.value as string;
    setSelectedWriteStory(storyId);
    setSelectedWriteChapter('');
    setSelectedWriteSection('');
    setWriteChapters([]);
    setWriteSections([]);
    setNewSectionData({
      title: '',
      body: '',
      mediaURI: '',
      sources: [],
      keywords: [],
    });
    setMediaPreview('');
    fetchWriteChapters(storyId);
  };

  const handleWriteChapterChange = (
    event: SelectChangeEvent<unknown>,
    child: React.ReactNode
  ) => {
    const chapterId = event.target.value as string;
    setSelectedWriteChapter(chapterId);
    setSelectedWriteSection('');
    setWriteSections([]);
    setNewSectionData({
      title: '',
      body: '',
      mediaURI: '',
      sources: [],
      keywords: [],
    });
    setMediaPreview('');
    fetchWriteSections(chapterId);
  };

  const handleWriteSectionChange = (
    event: SelectChangeEvent<unknown>,
    child: React.ReactNode
  ) => {
    const sectionId = event.target.value as string;
    if (sectionId === 'add') {
      // Handle adding a new section
      const newSection = {
        id: 'new', // Temporary ID
        title: 'Untitled Section',
        body: '',
        mediaURI: '',
        sources: [],
        keywords: [],
      };
      setWriteSections([newSection, ...writeSections]);
      setSelectedWriteSection('new');
      setNewSectionData({
        title: '',
        body: '',
        mediaURI: '',
        sources: [],
        keywords: [],
      });
      setMediaPreview('');
      return;
    }

    setSelectedWriteSection(sectionId);
    const section = writeSections.find(
      (sec) => sec.id.toString() === sectionId
    );
    if (section) {
      setNewSectionData({
        title: section.title,
        body: section.body,
        mediaURI: section.mediaURI,
        sources: section.sources,
        keywords: section.keywords,
      });
      setMediaPreview(section.mediaURI);
    } else {
      setNewSectionData({
        title: '',
        body: '',
        mediaURI: '',
        sources: [],
        keywords: [],
      });
      setMediaPreview('');
    }
  };

  useEffect(() => {
    const checkRole = async () => {
      try {
        if (devPublisher) {
          setHasPublisherRole(true);
          return;
        }
        const client = await getThirdwebBrowserClient();
        const address = await getAddress();
        const contract = getContract({ client, chain: base, address, abi });
        const role = "Commander";
        const result = await readContract({ contract, method: 'nftpdHasRole', params: [role, wallet.address] });
        setHasPublisherRole(result as boolean);
      } catch (error) {
        console.error('Error checking role:', error);
      } finally {
        setRoleChecked(true);
      }
    };

    if (wallet || devPublisher) {
      checkRole();
    }
  }, [wallet, getAddress, devPublisher]);

  // Function to add a new story
  const addStory = async () => {
    if (!newStoryTitle.trim()) return;

    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({ client, chain: base, address: address, abi });
      const transaction = await prepareContractCall({
        contract,
        method: 'createStory',
        params: [newStoryTitle.trim()],
        value: BigInt(0),
      });
      await sendAndConfirmTransaction({ transaction, account: wallet! });
      setNewStoryTitle('');
      setOpenAddStory(false);
      fetchStories();
    } catch (error) {
      console.error('Error adding story:', error);
    }
  };

  // Function to add a new chapter
  const addChapter = async () => {
    if (!newChapterTitle.trim() || !selectedWriteStory) return;

    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({ client, chain: base, address: address, abi });
      const transaction = await prepareContractCall({
        contract,
        method: 'createChapter',
        params: [Number(selectedWriteStory), newChapterTitle.trim()],
        value: BigInt(0),
      });
      await sendAndConfirmTransaction({ transaction, account: wallet! });
      setNewChapterTitle('');
      setOpenAddChapter(false);
      fetchWriteChapters(selectedWriteStory);
    } catch (error) {
      console.error('Error adding chapter:', error);
    }
  };

  // Function to publish a new section
  const publishSection = async () => {
    if (!newSectionData.title.trim() || !newSectionData.body.trim() || !selectedWriteStory || !selectedWriteChapter) {
      alert('Please fill in all required fields and select a story and chapter.');
      return;
    }

    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({ client, chain: base, address: address, abi });
      const transaction = await prepareContractCall({
        contract,
        method: 'publishSection',
        params: [
          Number(selectedWriteStory),
          Number(selectedWriteChapter),
          newSectionData.title.trim(),
          newSectionData.body.trim(),
          newSectionData.mediaURI.trim(),
          newSectionData.sources,
          newSectionData.keywords,
        ],
        value: BigInt(0),
      });
      await sendAndConfirmTransaction({ transaction, account: wallet! });
      setNewSectionData({ title: '', body: '', mediaURI: '', sources: [], keywords: [] });
      setMediaPreview('');
      fetchWriteSections(selectedWriteChapter);
    } catch (error) {
      console.error('Error publishing section:', error);
    }
  };

  // Function to update an existing section
  const updateSection = async () => {
    if (!selectedWriteSection) return;
    if (!newSectionData.title.trim() || !newSectionData.body.trim() || !selectedWriteStory || !selectedWriteChapter) {
      alert('Please fill in all required fields and select a story and chapter.');
      return;
    }

    try {
      const client = await getThirdwebBrowserClient();
      const address = await getAddress();
      const contract = getContract({ client, chain: base, address: address, abi });
      const transaction = await prepareContractCall({
        contract,
        method: 'updateSection',
        params: [
          Number(selectedWriteSection),
          newSectionData.title.trim(),
          newSectionData.body.trim(),
          newSectionData.mediaURI.trim(),
          newSectionData.sources,
          newSectionData.keywords,
        ],
        value: BigInt(0),
      });
      await sendAndConfirmTransaction({ transaction, account: wallet! });
      setSelectedWriteSection('');
      setNewSectionData({ title: '', body: '', mediaURI: '', sources: [], keywords: [] });
      setMediaPreview('');
      fetchWriteSections(selectedWriteChapter);
    } catch (error) {
      console.error('Error updating section:', error);
    }
  };

  // Handle Media Preview in Publish Section
  useEffect(() => {
    if (newSectionData.mediaURI.trim()) {
      // Simple validation for image URLs
      if (/\.(jpeg|jpg|gif|png|webp)$/.test(newSectionData.mediaURI.trim())) {
        setMediaPreview(newSectionData.mediaURI.trim());
      } else {
        setMediaPreview('');
      }
    } else {
      setMediaPreview('');
    }
  }, [newSectionData.mediaURI]);

  // Function to validate media URI
  const isValidImageURL = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      // Relaxed: render if https/http and likely an image provider; extensions optional
      const isHttp = parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
      const looksImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(parsedUrl.pathname) || parsedUrl.hostname.includes('ipfs') || parsedUrl.search.length > 0;
      return isHttp && (looksImage || true);
    } catch (e) {
      return false;
    }
  };

  // Update mediaPreview when mediaURI changes
  useEffect(() => {
    if (newSectionData.mediaURI.trim()) {
      if (isValidImageURL(newSectionData.mediaURI.trim())) {
        setMediaPreview(newSectionData.mediaURI.trim());
      } else {
        setMediaPreview('');
      }
    } else {
      setMediaPreview('');
    }
  }, [newSectionData.mediaURI]);

  // Handle dynamic section title update
  useEffect(() => {
    if (selectedWriteSection === 'new') {
      setWriteSections((prev) =>
        prev.map((sec) =>
          sec.id === 'new' ? { ...sec, title: newSectionData.title || 'Untitled Section' } : sec
        )
      );
    }
  }, [newSectionData.title, selectedWriteSection]);

  const hasMedia = !!newSectionData.mediaURI.trim();
  const hasSources = newSectionData.sources.length > 0;
  const hasKeywords = newSectionData.keywords.length > 0;

  const [publisherRibbon, setPublisherRibbon] = useState<'style' | 'metadata' | 'narrative' | 'publish' | 'mood'>('metadata');
  const [mood, setMood] = useState<'Epic' | 'Reflective' | 'Urgent' | 'Hopeful' | 'Somber' | 'Custom'>('Epic');
  const [customMood, setCustomMood] = useState('');
  const [confirmNewSectionOpen, setConfirmNewSectionOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const draftKey = 'mythologyDraft';
  const [suspendDraftSave, setSuspendDraftSave] = useState(false);
  const tutorialKey = 'mythologyWriterTutorialSeen';
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const readerTutorialKey = 'mythologyReaderTutorialSeen';
  const [readerTutorialOpen, setReaderTutorialOpen] = useState(false);
  const [readerTutorialStep, setReaderTutorialStep] = useState(0);

  // Demo content for Reader when enabled
  const demoStory = { id: 'demo', title: 'NFTPD: The First Light' } as any;
  const demoChapters = [{ id: 'demo-1', title: 'Prologue' }] as any[];
  const demoSections = [{
    id: 'demo-1-1',
    title: 'Dawn over Aether',
    body: `# Dawn over Aether\n\nThe city woke in monochrome, steel and light etched in quiet resolve.\n\nAbove, the NFTPD medallion held steady — a symbol of clarity and truth.\n\n> "Every beginning is a doorway; step through."\n\nWelcome to the Mythology of NFTPD.`,
    mediaURI: '/vision.jpg',
    sources: ['https://nftpd.community', 'On-chain archives'],
    keywords: ['demo', 'mythology', 'aether']
  }] as any[];

  // Draft: save
  useEffect(() => {
    try {
      if (suspendDraftSave) return;
      const payload = {
        newSectionData,
        selectedWriteStory,
        selectedWriteChapter,
        selectedWriteSection,
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch { }
  }, [newSectionData, selectedWriteStory, selectedWriteChapter, selectedWriteSection, suspendDraftSave]);

  // Draft: load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const { newSectionData: d, selectedWriteStory: s, selectedWriteChapter: c, selectedWriteSection: sec } = JSON.parse(raw);
        if (d) setNewSectionData(d);
        if (s) setSelectedWriteStory(s);
        if (c) setSelectedWriteChapter(c);
        if (sec) setSelectedWriteSection(sec);
        if (d?.mediaURI) setMediaPreview(d.mediaURI);
        // Fetch narrative lists to reflect restored selections without overriding draft content
        (async () => {
          if (s) await fetchWriteChapters(s, true);
          if (c) await fetchWriteSections(c, true);
        })();
      }
      // Open tutorial if first time and no stories exist
      const seen = localStorage.getItem(tutorialKey);
      if (!seen) {
        setTutorialOpen(true);
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open per-panel tutorial on first visit
  useEffect(() => {
    try {
      if (activeTab === 'viewer') {
        const seenReader = localStorage.getItem(readerTutorialKey);
        if (!seenReader) setReaderTutorialOpen(true);
      }
      if (activeTab === 'publisher') {
        const seenWriter = localStorage.getItem(tutorialKey);
        if (!seenWriter) setTutorialOpen(true);
      }
    } catch { }
  }, [activeTab]);

  // Ensure only the matching tutorial is visible for the current tab
  useEffect(() => {
    if (activeTab === 'viewer' && tutorialOpen) setTutorialOpen(false);
    if (activeTab === 'publisher' && readerTutorialOpen) setReaderTutorialOpen(false);
  }, [activeTab, tutorialOpen, readerTutorialOpen]);

  const loadDraft = async () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setInfoModal({ open: true, title: 'No Draft Found', message: 'There is no saved draft to load.' });
        return;
      }
      const { newSectionData: d, selectedWriteStory: s, selectedWriteChapter: c } = JSON.parse(raw);
      if (d) setNewSectionData(d);
      if (d?.mediaURI) setMediaPreview(d.mediaURI);
      if (s) { setSelectedWriteStory(s); await fetchWriteChapters(s, true); }
      if (c) { setSelectedWriteChapter(c); await fetchWriteSections(c, true); }
      setInfoModal({ open: true, title: 'Draft Loaded', message: 'Your draft was restored.' });
    } catch (e: any) {
      setInfoModal({ open: true, title: 'Error', message: 'Failed to load draft.' });
    }
  };

  const tutorialSteps = [
    { title: 'Welcome', body: 'Welcome to Mythology! We\'ll guide you through creating your first story. You can skip at any time.' },
    { title: 'Create a Story', body: 'Start by creating a new Story. Click "Add Story" in the Narrative ribbon or use the button below.' },
    { title: 'Add a Chapter', body: 'Next, add a Chapter to your story using the Narrative ribbon.' },
    { title: 'Section Metadata', body: 'Use the Metadata ribbon to add a Title and optional Media, Sources, and Keywords. These will render in the document automatically.' },
    { title: 'Write and Publish', body: 'Write your content in the main canvas. When ready, go to the Publish ribbon to publish and download a share card.' },
  ];
  const closeTutorial = () => { try { localStorage.setItem(tutorialKey, 'true'); } catch { }; setTutorialOpen(false); setTutorialStep(0); };

  const readerTutorialSteps = [
    { title: 'Welcome', body: 'Welcome to the Library. We\'ll show you how to browse and read stories.' },
    { title: 'Browse Library', body: 'Use the Library on the left (or the menu on mobile) to choose a Story.' },
    { title: 'Pick a Chapter', body: 'Select a Chapter to reveal its Sections.' },
    { title: 'Open a Section', body: 'Click a Section to load its title, media, sources, and content.' },
    { title: 'Customize Reading', body: 'Use the controls at the top to change font and background. Enjoy your reading!' },
  ];
  const closeReaderTutorial = () => { try { localStorage.setItem(readerTutorialKey, 'true'); } catch { }; setReaderTutorialOpen(false); setReaderTutorialStep(0); };

  // Share card generator
  const generateShareCard = async (): Promise<Blob | null> => {
    try {
      const canvas = document.createElement('canvas') as unknown as HTMLCanvasElement;
      const width = 1200; const height = 630; // social preview size
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null; if (!ctx) return null;

      const canvasToBlob = async (): Promise<Blob | null> => {
        return await new Promise<Blob | null>((res) => {
          canvas.toBlob((b: Blob | null) => {
            if (b) return res(b);
            try {
              const dataUrl = canvas.toDataURL('image/png');
              const arr = dataUrl.split(',');
              const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
              const bstr = atob(arr[1]);
              let n = bstr.length; const u8arr = new Uint8Array(n);
              while (n--) u8arr[n] = bstr.charCodeAt(n);
              res(new Blob([u8arr], { type: mime }));
            } catch { res(null); }
          }, 'image/png');
        });
      };

      // Helpers
      const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };

      // Background base
      ctx.fillStyle = '#0C0D12';
      ctx.fillRect(0, 0, width, height);

      // Diagonal grayscale gradient overlay
      let grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(255,255,255,0.25)');
      grad.addColorStop(0.4, 'rgba(200,200,200,0.18)');
      grad.addColorStop(1, 'rgba(10,10,14,0.8)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle vignette
      const vignette = ctx.createRadialGradient(width / 2, height / 2, height / 6, width / 2, height / 2, height / 1.1);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Media container (rounded, big, with glow)
      let mediaY = 110;
      if (mediaPreview) {
        try {
          // Try fetching as blob to avoid CORS taint
          const resp = await fetch(mediaPreview, { mode: 'cors' });
          const blob = await resp.blob();
          const bmp = await createImageBitmap(blob);
          const thumbW = 520, thumbH = 300; const x = 60, y = mediaY; const radius = 20;
          ctx.save();
          ctx.shadowColor = 'rgba(255,255,255,0.35)';
          ctx.shadowBlur = 24; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 6;
          roundedRect(x, y, thumbW, thumbH, radius);
          ctx.clip();
          ctx.drawImage(bmp, x, y, thumbW, thumbH);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
          roundedRect(x, y, thumbW, thumbH, radius); ctx.stroke();
        } catch {
          // If media cannot be fetched/drawn, skip it gracefully
          mediaY = 80;
        }
      } else {
        mediaY = 80;
      }

      // NFTPD Medallion with grayscale glow
      const logo = new Image(); logo.src = '/Medallions/NFTPD.png';
      await new Promise((res) => { logo.onload = res; logo.onerror = res; });
      const lgSize = 220;
      const lgx = width - (lgSize + 60);
      const lgy = 24;
      // Outer radial glow
      let glow = ctx.createRadialGradient(lgx + lgSize / 2, lgy + lgSize / 2, 10, lgx + lgSize / 2, lgy + lgSize / 2, 170);
      glow.addColorStop(0, 'rgba(255,255,255,0.5)');
      glow.addColorStop(0.4, 'rgba(255,255,255,0.2)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lgx + lgSize / 2, lgy + lgSize / 2, 170, 0, Math.PI * 2); ctx.fill();
      // Inner soft fade (spotlight)
      const inner = ctx.createRadialGradient(lgx + lgSize / 2, lgy + lgSize / 2, 0, lgx + lgSize / 2, lgy + lgSize / 2, 110);
      inner.addColorStop(0, 'rgba(255,255,255,0.15)');
      inner.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(lgx + lgSize / 2, lgy + lgSize / 2, 110, 0, Math.PI * 2); ctx.fill();
      // Medallion image
      ctx.drawImage(logo, lgx, lgy, lgSize, lgSize);
      // Ring accent
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(lgx + lgSize / 2, lgy + lgSize / 2, lgSize / 2 + 6, 0, Math.PI * 2); ctx.stroke();

      // Title (larger)
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 56px Inter, Segoe UI, sans-serif';
      const title = (newSectionData.title || 'Untitled').slice(0, 160);
      const titleX = 60; const titleY = 70;
      const wrap = (text: string, maxWidth: number) => {
        const words = text.split(' '); const lines: string[] = []; let line = '';
        words.forEach(w => { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width < maxWidth) line = test; else { if (line) lines.push(line); line = w; } });
        if (line) lines.push(line); return lines;
      };
      const titleLines = wrap(title, width - 260);
      titleLines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, titleX, titleY + i * 62));

      // Meta footer band (positioned and padded properly)
      const bandX = 40, bandY = height - 130, bandW = width - 80, bandH = 92, pad = 20;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundedRect(bandX, bandY, bandW, bandH, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; roundedRect(bandX, bandY, bandW, bandH, 14); ctx.stroke();
      const dateStr = new Date().toLocaleString();
      ctx.font = '600 26px Inter, sans-serif'; ctx.fillStyle = '#E7EAF6';
      ctx.fillText(`Published: ${dateStr}`, bandX + pad, bandY + 36 + pad / 2);
      ctx.font = '500 20px Inter, sans-serif'; ctx.fillStyle = '#C9CEEC';
      ctx.fillText('NFTPD', bandX + pad, bandY + 64 + pad / 2);

      // Return blob with fallback
      return await canvasToBlob();
    } catch { return null; }
  };

  return (
    <Container isMobile={isMobile} style={{ backgroundColor: backgroundColors[selectedBackground] }}>
      {/* Ribbon Toolbar */}
      <Ribbon sx={{ mb: 2 }}>
        {/* Top controls row */}
        <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {isMobile && (
              <IconButton
                onClick={() => setNavOpen(true)}
                size="small"
                aria-label="open navigator"
                sx={{
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow: `0 0 14px rgba(255,255,255,0.25)`,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <ToggleButtonGroup
              value={activeTab}
              exclusive
              onChange={(e, v) => v && setActiveTab(v)}
              size="small"
              color="primary"
              sx={{
                '& .MuiToggleButton-root': {
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.18)',
                  background: 'rgba(18,18,18,0.45)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  textTransform: 'none',
                  transition: 'all .2s ease',
                  boxShadow: `0 0 0 0 rgba(255,255,255,0)`,
                  '&:hover': {
                    borderColor: '#ffffff',
                    background: 'rgba(255,255,255,0.08)',
                    boxShadow: `0 0 12px rgba(255,255,255,0.25)`,
                  },
                },
                '& .MuiToggleButton-root.Mui-selected': {
                  color: '#111',
                  borderColor: '#ffffff',
                  background: `linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))`,
                  boxShadow: `0 0 16px rgba(255,255,255,0.35)`,
                },
                '& .MuiToggleButton-root.Mui-disabled': {
                  opacity: 0.6,
                  color: 'rgba(255,255,255,0.6)'
                }
              }}
            >
              <ToggleButton value="viewer">Read</ToggleButton>
              <ToggleButton value="publisher" disabled={!canPublish}>
                {canPublish ? 'Write' : <><LockIcon fontSize="small" style={{ marginRight: 4 }} />Write</>}
              </ToggleButton>
            </ToggleButtonGroup>
            {activeTab === 'viewer' ? (
              <Button size="small" startIcon={<HelpOutlineIcon />} onClick={() => setReaderTutorialOpen(true)} sx={{ color: '#fff' }}>Tutorial</Button>
            ) : (
              <Button size="small" startIcon={<HelpOutlineIcon />} onClick={() => setTutorialOpen(true)} sx={{ color: '#fff' }}>Tutorial</Button>
            )}
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Theme controls inline */}
            {activeTab === 'viewer' && (
              <>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" sx={{ color: '#fff' }}>Font</Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <StyledSelectComponent value={fontFamily} onChange={(e) => setFontFamily(e.target.value as string)}>
                      {fontOptions.map((font) => (
                        <MenuItem key={font.value} value={font.value}>{font.label}</MenuItem>
                      ))}
                    </StyledSelectComponent>
                  </FormControl>
                </Box>
              </>
            )}
          </Stack>
        </Stack>

        {/* Ribbon tabs bar (like Word: Home/Insert/etc.) */}
        {activeTab === 'publisher' && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: 'wrap', overflowX: 'auto' }}>
            {(['style', 'metadata', 'narrative', 'mood', 'publish'] as const).map((tab) => (
              <Button
                key={tab}
                size="small"
                onClick={() => setPublisherRibbon(tab)}
                sx={{
                  color: '#fff',
                  textTransform: 'none',
                  borderBottom: publisherRibbon === tab ? `2px solid #ffffff` : '2px solid transparent',
                  borderRadius: 0,
                  px: 1.5,
                  minWidth: 64,
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </Stack>
        )}

        {/* Dynamic options row under selected ribbon */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', rowGap: 1, overflowX: 'auto' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {activeTab === 'publisher' && publisherRibbon === 'style' && (
              <>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" sx={{ color: '#fff' }}>Font</Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <StyledSelectComponent value={fontFamily} onChange={(e) => setFontFamily(e.target.value as string)}>
                      {fontOptions.map((font) => (
                        <MenuItem key={font.value} value={font.value}>{font.label}</MenuItem>
                      ))}
                    </StyledSelectComponent>
                  </FormControl>
                  <Typography variant="body2" sx={{ color: '#fff' }}>Size</Typography>
                  <StyledSliderComponent value={fontSize} onChange={(e, v) => setFontSize(v as number)} min={14} max={24} step={1} sx={{ width: 100 }} />
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" sx={{ color: '#fff' }}>BG</Typography>
                  <Box display="flex" gap={1}>
                    {(['dark', 'light', 'sepia'] as BackgroundType[]).map((bg) => (
                      <ColorOption key={bg} color={backgroundColors[bg]} selected={selectedBackground === bg} onClick={() => setSelectedBackground(bg)} />
                    ))}
                  </Box>
                </Box>
              </>
            )}
            {activeTab === 'publisher' && publisherRibbon === 'metadata' && (
              <Stack direction="row" spacing={1} alignItems="center">
                <StyledTextField
                  label="Title"
                  value={newSectionData.title}
                  onChange={(e) => setNewSectionData({ ...newSectionData, title: e.target.value })}
                  size="small"
                  inputRef={titleInputRef}
                  sx={{
                    width: 240,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: newSectionData.title ? '#ffffff' : undefined },
                    boxShadow: newSectionData.title ? `0 0 12px rgba(255,255,255,0.35)` : 'none'
                  }}
                />
                <StyledTextField
                  label="Media URI"
                  value={newSectionData.mediaURI}
                  onChange={(e) => setNewSectionData({ ...newSectionData, mediaURI: e.target.value })}
                  size="small"
                  inputRef={mediaInputRef}
                  sx={{
                    width: 280,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: newSectionData.mediaURI ? '#ffffff' : undefined },
                    boxShadow: newSectionData.mediaURI ? `0 0 12px rgba(255,255,255,0.35)` : 'none'
                  }}
                />
                <StyledTextField
                  label="Add source"
                  value={inputSource}
                  onChange={(e) => setInputSource(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputSource.trim()) {
                      setNewSectionData({ ...newSectionData, sources: [...newSectionData.sources, inputSource.trim()] });
                      setInputSource('');
                      e.preventDefault();
                    }
                  }}
                  size="small"
                  inputRef={sourceInputRef}
                  sx={{ width: 200, '& .MuiOutlinedInput-notchedOutline': { borderColor: newSectionData.sources.length ? '#ffffff' : undefined }, boxShadow: newSectionData.sources.length ? `0 0 12px rgba(255,255,255,0.25)` : 'none' }}
                />
                {/* Manage sources chips */}
                {newSectionData.sources.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 240 }}>
                    {newSectionData.sources.map((s, i) => (
                      <Chip key={i} label={s} onDelete={() => setNewSectionData({ ...newSectionData, sources: newSectionData.sources.filter((x) => x !== s) })} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                    ))}
                  </Box>
                )}
                <StyledTextField
                  label="Add keyword"
                  value={inputKeyword}
                  onChange={(e) => setInputKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputKeyword.trim()) {
                      setNewSectionData({ ...newSectionData, keywords: [...newSectionData.keywords, inputKeyword.trim()] });
                      setInputKeyword('');
                      e.preventDefault();
                    }
                  }}
                  size="small"
                  inputRef={keywordInputRef}
                  sx={{ width: 200, '& .MuiOutlinedInput-notchedOutline': { borderColor: newSectionData.keywords.length ? '#ffffff' : undefined }, boxShadow: newSectionData.keywords.length ? `0 0 12px rgba(255,255,255,0.25)` : 'none' }}
                />
                {/* Manage keywords chips */}
                {newSectionData.keywords.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 240 }}>
                    {newSectionData.keywords.map((k, i) => (
                      <Chip key={i} label={k} onDelete={() => setNewSectionData({ ...newSectionData, keywords: newSectionData.keywords.filter((x) => x !== k) })} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                    ))}
                  </Box>
                )}
              </Stack>
            )}
            {activeTab === 'publisher' && publisherRibbon === 'narrative' && (
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="story-select-label" sx={{ color: '#fff' }}>Story</InputLabel>
                  <StyledSelectComponent labelId="story-select-label" value={selectedWriteStory} onChange={handleWriteStoryChange} label="Story">
                    {stories.map((story) => (
                      <MenuItem key={story.id} value={story.id.toString()} sx={{ color: '#111' }}>{truncate(story.title, 30)}</MenuItem>
                    ))}
                    <MenuItem value="__add__" sx={{ color: '#111' }} onClick={() => setOpenAddStory(true)}>
                      <em>Add Story…</em>
                    </MenuItem>
                  </StyledSelectComponent>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }} disabled={writeChapters.length === 0}>
                  <InputLabel id="write-chapter-select-label" sx={{ color: '#fff' }}>Chapter</InputLabel>
                  <StyledSelectComponent labelId="write-chapter-select-label" value={selectedWriteChapter} onChange={handleWriteChapterChange} label="Chapter">
                    {writeChapters.map((chapter) => (
                      <MenuItem key={chapter.id} value={chapter.id.toString()} sx={{ color: '#111' }}>{truncate(chapter.title, 30)}</MenuItem>
                    ))}
                  </StyledSelectComponent>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="write-section-select-label" sx={{ color: '#fff' }}>Section</InputLabel>
                  <StyledSelectComponent labelId="write-section-select-label" value={selectedWriteSection} onChange={(e) => { const sectionId = e.target.value as string; if (sectionId === 'add') { setConfirmNewSectionOpen(true); } else { handleWriteSectionChange(e, null); } }} label="Section">
                    {writeSections.map((section) => (
                      <MenuItem key={section.id} value={section.id.toString()} sx={{ color: '#111' }}>{truncate(section.title, 30)}</MenuItem>
                    ))}
                    <MenuItem value="add" style={{ color: '#ffffff' }}><em>Add Section</em></MenuItem>
                  </StyledSelectComponent>
                </FormControl>
                {/* Add controls */}
                <Button variant="contained" size="small" onClick={() => setOpenAddStory(true)} sx={{ backgroundColor: '#ffffff', color: '#000' }}>Add Story</Button>
                <Button variant="contained" size="small" onClick={() => setOpenAddChapter(true)} disabled={!selectedWriteStory} sx={{ backgroundColor: '#ffffff', color: '#000' }}>Add Chapter</Button>
                <Button variant="contained" size="small" onClick={() => setConfirmNewSectionOpen(true)} sx={{ backgroundColor: '#ffffff', color: '#000' }}>Add Section</Button>
                {selectedWriteSection === 'new' && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setConfirmDiscardOpen(true)}
                    sx={{ color: '#fff', borderColor: '#fff' }}
                  >
                    Discard Section
                  </Button>
                )}
              </Stack>
            )}
            {activeTab === 'publisher' && publisherRibbon === 'mood' && (
              <Stack direction="row" spacing={1} alignItems="center">
                {/* Typing sound options only */}
                <Box display="flex" flexDirection="row" flexWrap="wrap" gap={1} ml={2}>
                  {soundOptions.map((option, index) => {
                    const isSelected = typingSound === option.src;
                    return (
                      <Tooltip key={index} title={option.hoverText}>
                        <Button
                          variant="contained"
                          onClick={() => handleSoundSelection(option.src)}
                          sx={{
                            backgroundColor: option.color,
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            minWidth: 'unset',
                            border: isSelected ? `2px solid ${accentColor}` : 'none',
                            boxShadow: isSelected ? `0 0 10px ${accentColor}` : 'none',
                            p: 0,
                          }}
                        >
                          <MusicNoteIcon sx={{ color: '#fff', fontSize: 18 }} />
                        </Button>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Stack>
            )}
            {activeTab === 'publisher' && publisherRibbon === 'publish' && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    if (selectedWriteSection === 'new') {
                      await publishSection();
                    } else {
                      await updateSection();
                    }
                    try { localStorage.removeItem(draftKey); } catch { }
                  }}
                  disabled={!newSectionData.title.trim() || !newSectionData.body.trim() || !selectedWriteStory || !selectedWriteChapter}
                  sx={{ backgroundColor: '#ffffff', color: '#000' }}
                >
                  {selectedWriteSection === 'new' ? 'Publish' : 'Update'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    try {
                      const blob = await generateShareCard();
                      if (!blob) { setInfoModal({ open: true, title: 'Card Error', message: 'Could not render your share card (possibly due to image CORS). Try using a different media URL or remove media and try again.' }); return; }
                      const file = new File([blob], 'share-card.png', { type: 'image/png' });
                      if ((navigator as any).share && (navigator as any).canShare?.({ files: [file] })) {
                        await (navigator as any).share({
                          files: [file],
                          title: newSectionData.title || 'My Story',
                          text: 'Check out my story on Invisible Enemies',
                        });
                      } else {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a') as unknown as HTMLAnchorElement;
                        a.href = url; a.download = 'share-card.png'; a.click();
                        URL.revokeObjectURL(url);
                        setInfoModal({ open: true, title: 'Card Ready', message: 'Share card downloaded to your device.' });
                      }
                    } catch { }
                  }}
                  sx={{ color: '#fff', borderColor: '#fff' }}
                  startIcon={<DownloadIcon />}
                >
                  Download/Share Card
                </Button>
                <Button variant="outlined" size="small" onClick={loadDraft} sx={{ color: '#fff', borderColor: '#fff' }}>Load Draft</Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Ribbon>

      {/* Content Area */}
      <Box
        display="flex"
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
        minHeight={0}
        height="100%"
      >
        {/* Viewer Tab Content */}
        {activeTab === 'viewer' && (
          <Box
            display="flex"
            flexDirection="column"
            flexGrow={1}
            overflow="hidden"
          >
            <GlassCard sx={{ flexGrow: 1, height: '100%', minHeight: 0, overflow: 'hidden', p: 0, display: 'flex' }}>
              <Box display="flex" height="100%" width="100%" sx={{ minHeight: 0 }}>
                {/* Sidebar (desktop) */}
                {!isMobile && (
                  <Box width={280} p={2} sx={{ borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                    <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>Library</Typography>
                    <List dense sx={{ color: '#fff' }}>
                      {stories.map((story) => (
                        <React.Fragment key={story.id}>
                          <ListItemButton selected={selectedStory === story.id.toString()} onClick={() => selectStory(story.id.toString())}>
                            <ListItemText primary={truncate(story.title, 36)} primaryTypographyProps={{ sx: { color: '#F3F6FF' } }} />
                          </ListItemButton>
                          {selectedStory === story.id.toString() && (
                            <List disablePadding sx={{ pl: 2 }}>
                              {chapters.map((chapter) => (
                                <React.Fragment key={chapter.id}>
                                  <ListItemButton selected={selectedChapter === chapter.id.toString()} onClick={() => selectChapter(chapter.id.toString())}>
                                    <ListItemText primary={truncate(chapter.title, 34)} primaryTypographyProps={{ sx: { color: '#F3F6FF' } }} />
                                  </ListItemButton>
                                  {selectedChapter === chapter.id.toString() && (
                                    <List disablePadding sx={{ pl: 2 }}>
                                      {sections.map((section) => (
                                        <ListItemButton key={section.id} selected={selectedSection === section.id.toString()} onClick={() => { selectSection(section.id.toString()); setNavOpen(false); }}>
                                          <ListItemText primary={truncate(section.title, 32)} primaryTypographyProps={{ sx: { color: '#F3F6FF' } }} />
                                        </ListItemButton>
                                      ))}
                                    </List>
                                  )}
                                </React.Fragment>
                              ))}
                            </List>
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  </Box>
                )}
                {/* Main reading column */}
                <Box flex={1} minHeight={0} p={2} display="flex" flexDirection="column" sx={{ overflow: 'hidden' }}>
                  {/* Contiguous Content Display */}
                  {selectedStory && selectedChapter && selectedSection ? (
                    <ContentArea
                      fontFamily={fontFamily}
                      style={{ color: textColor, fontSize: `${fontSize}px` }}
                      sx={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', overflowY: isMobile ? 'scroll' : 'auto', WebkitOverflowScrolling: isMobile ? 'touch' : undefined, pb: isMobile ? '14vh' : 2 }}
                    >
                      {viewerMeta.title?.trim() && (
                        <Typography variant="h4" sx={{ mb: 2 }}>{viewerMeta.title}</Typography>
                      )}
                      {mediaURI && isValidImageURL(mediaURI) && (
                        <Box sx={{ mb: 2 }}><StyledImage src={mediaURI} alt="Section Media" /></Box>
                      )}
                      {content ? (
                        <ReactMarkdown components={{ p: ({ node, ...props }: any) => <p {...props} /> } as any}>
                          {content}
                        </ReactMarkdown>
                      ) : (
                        <Typography variant="h6" color="textSecondary">Select a section to read its content.</Typography>
                      )}
                      {viewerMeta.sources?.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Sources</Typography>
                          <List dense>
                            {viewerMeta.sources.map((s, i) => (
                              <ListItem key={i} sx={{ py: 0.25 }}><ListItemText primary={s} /></ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      {viewerMeta.keywords?.length > 0 && (
                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {viewerMeta.keywords.map((k, i) => (
                            <Chip key={i} label={k} size="small" sx={{ backgroundColor: 'rgba(29, 245, 106, 0.2)', color: '#fff' }} />
                          ))}
                        </Box>
                      )}
                    </ContentArea>
                  ) : (
                    <ContentArea fontFamily={fontFamily} style={{ color: textColor, fontSize: `${fontSize}px` }} sx={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', textAlign: 'center', position: 'relative', overflowY: isMobile ? 'scroll' : 'auto', WebkitOverflowScrolling: isMobile ? 'touch' : undefined, pb: isMobile ? '10vh' : -70 }}>
                      <Box sx={{ position: 'absolute', maxHeight: '50px', inset: 0, pointerEvents: 'none', background: 'radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,0.10), transparent 70%)' }} />
                      <Box sx={{ position: 'relative', maxWidth: 820, px: 2, py: 3, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, background: 'rgba(18,18,18,0.45)', boxShadow: `0 10px 28px rgba(255,255,255,0.18)`, backdropFilter: 'blur(10px)' }}>
                        <Typography variant="h3" sx={{
                          mb: 1,
                          fontWeight: 800,
                          background: `linear-gradient(92deg, #fff 0%, #ccc 60%, #888 100%)`,
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          color: 'transparent',
                          textShadow: '0 2px 18px rgba(255,255,255,0.25)'
                        }}>
                          The Mythology of NFTPD
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: '#E0E0E0', mb: 1 }}>
                          Tales etched in light, carried by chains, and whispered through medallions.
                        </Typography>
                        <Box sx={{ mt: 1, width: '100%', display: 'flex', justifyContent: 'center', borderRadius: '10px' }}>
                          <Box sx={{ maxWidth: 600, width: '100%', px: 2 }}>
                            <CoverImage src="/vision.jpg" sx={{ borderRadius: '10px' }} alt="Mythology" />
                          </Box>
                        </Box>
                        <Box sx={{ height: 1, width: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', mt: -25, mb: 1 }} />
                        <Typography sx={{ color: '#E0E0E0', fontSize: '1rem', lineHeight: 1.6, px: { xs: 0, md: 2 } }}>
                          Begin by selecting a <strong>Story</strong> from the Library, choose a <strong>Chapter</strong>,
                          then open a <strong>Section</strong> to enter the myth. Adjust your reading style with the
                          ribbon above.
                        </Typography>
                        <Typography sx={{ color: '#BDBDBD', mt: 1, fontStyle: 'italic' }}>
                          — Every beginning is a doorway; step through.
                        </Typography>
                      </Box>
                    </ContentArea>
                  )}
                </Box>
              </Box>
            </GlassCard>
          </Box>
        )}

        {/* Publisher Tab Content */}
        {activeTab === 'publisher' && hasPublisherRole && (
          <Box
            display="flex"
            flexDirection="column"
            flexGrow={1}
            overflow="hidden"
          >
            <PublisherContainer>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                marginBottom={2}
                flexWrap="wrap"
                gap={2}
              >
                {/* Selection Controls */}
                {/* Narrative quick selectors remain in the narrative ribbon */}
              </Box>

              {/* Composer: continuous page-like editing area (no redundant form fields) */}
              <GlassCard sx={{ mb: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)' }}>
                <Box display="flex" flexDirection="column" gap={2} sx={{ flex: 1, overflow: 'hidden' }}>
                  {newSectionData.title?.trim() && (
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>{newSectionData.title}</Typography>
                  )}
                  {mediaPreview && <PreviewImage src={mediaPreview} alt="Media Preview" />}
                  <StyledTextField
                    placeholder="Write your story…"
                    variant="outlined"
                    value={newSectionData.body}
                    onChange={(e) => setNewSectionData({ ...newSectionData, body: e.target.value })}
                    onKeyDown={handleTyping}
                    inputRef={bodyInputRef}
                    multiline
                    autoFocus
                    rows={10}
                    InputProps={{
                      sx: {
                        border: 'none',
                        background: 'transparent',
                        lineHeight: 1.6,
                        color: '#F3F6FF',
                        height: '100%',
                        alignItems: 'stretch',
                        '& textarea': { height: '100%', minHeight: '50vh' },
                      },
                    }}
                    sx={{ flex: 1, display: 'flex' }}
                  />
                  {/* Inline meta (read-only) displayed below body */}
                  {(newSectionData.sources.length > 0 || newSectionData.keywords.length > 0) && (
                    <Box display="flex" gap={2} flexWrap="wrap">
                      {newSectionData.sources.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 0.5 }}>Sources</Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {newSectionData.sources.map((s, i) => (
                              <Chip key={i} label={s} sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                            ))}
                          </Box>
                        </Box>
                      )}
                      {newSectionData.keywords.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 0.5 }}>Keywords</Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {newSectionData.keywords.map((k, i) => (
                              <Chip key={i} label={k} sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </GlassCard>
            </PublisherContainer>
          </Box>
        )}

        {/* Add Story Modal */}
        <Dialog open={openAddStory} onClose={() => setOpenAddStory(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { background: 'rgba(25,25,25,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' } }}>
          <DialogTitle>Add New Story</DialogTitle>
          <DialogContent>
            <StyledTextField
              autoFocus
              margin="dense"
              label="Story Title"
              type="text"
              fullWidth
              variant="outlined"
              value={newStoryTitle}
              onChange={(e) => setNewStoryTitle(e.target.value)}
              helperText="Enter the title of the new story."
              FormHelperTextProps={{ style: { color: '#e0e0e0' } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddStory(false)} color="secondary">
              Cancel
            </Button>
            <Button onClick={addStory} color="primary" variant="contained" disabled={!newStoryTitle.trim()}>
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Chapter Modal */}
        <Dialog open={openAddChapter} onClose={() => setOpenAddChapter(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { background: 'rgba(25,25,25,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' } }}>
          <DialogTitle>Add New Chapter</DialogTitle>
          <DialogContent>
            <StyledTextField
              autoFocus
              margin="dense"
              label="Chapter Title"
              type="text"
              fullWidth
              variant="outlined"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              helperText="Enter the title of the new chapter."
              FormHelperTextProps={{ style: { color: '#e0e0e0' } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddChapter(false)} color="secondary">
              Cancel
            </Button>
            <Button onClick={addChapter} color="primary" variant="contained" disabled={!newChapterTitle.trim()}>
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Mobile Navigation Drawer */}
        <Drawer anchor="left" open={navOpen} onClose={() => setNavOpen(false)}>
          <Box role="presentation" sx={{ width: 290 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
              <Typography variant="subtitle1">Library</Typography>
              <IconButton onClick={() => setNavOpen(false)} size="small"><CloseIcon /></IconButton>
            </Box>
            <Divider />
            <List>
              {stories.map((story) => (
                <React.Fragment key={story.id}>
                  <ListItemButton selected={selectedStory === story.id.toString()} onClick={() => selectStory(story.id.toString())}>
                    <ListItemText primary={truncate(story.title, 36)} primaryTypographyProps={{ sx: { color: '#111' } }} />
                  </ListItemButton>
                  {selectedStory === story.id.toString() && (
                    <List disablePadding sx={{ pl: 2 }}>
                      {chapters.map((chapter) => (
                        <React.Fragment key={chapter.id}>
                          <ListItemButton selected={selectedChapter === chapter.id.toString()} onClick={() => selectChapter(chapter.id.toString())}>
                            <ListItemText primary={truncate(chapter.title, 34)} primaryTypographyProps={{ sx: { color: '#111' } }} />
                          </ListItemButton>
                          {selectedChapter === chapter.id.toString() && (
                            <List disablePadding sx={{ pl: 2 }}>
                              {sections.map((section) => (
                                <ListItemButton key={section.id} selected={selectedSection === section.id.toString()} onClick={() => { selectSection(section.id.toString()); setNavOpen(false); }}>
                                  <ListItemText primary={truncate(section.title, 32)} primaryTypographyProps={{ sx: { color: '#111' } }} />
                                </ListItemButton>
                              ))}
                            </List>
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Confirm new section dialog */}
        <Dialog open={confirmNewSectionOpen} onClose={() => setConfirmNewSectionOpen(false)}>
          <DialogTitle sx={{ color: '#fff' }}>Start a new section?</DialogTitle>
          <DialogContent sx={{ color: '#ddd' }}>
            <Typography>This will create a new section. Unsaved content is cached locally and can be restored later.</Typography>
          </DialogContent>
          <DialogActions sx={{ pb: 2, px: 2 }}>
            <Button onClick={() => setConfirmNewSectionOpen(false)} color="secondary">Cancel</Button>
            <Button onClick={() => { const untitledSection = { id: 'new', title: 'Untitled Section', body: '', mediaURI: '', sources: [], keywords: [] } as any; setSuspendDraftSave(true); setWriteSections([...writeSections, untitledSection]); setSelectedWriteSection('new'); setNewSectionData({ title: '', body: '', mediaURI: '', sources: [], keywords: [] }); setMediaPreview(''); setSuspendDraftSave(false); setConfirmNewSectionOpen(false); }} color="primary" variant="contained">Proceed</Button>
          </DialogActions>
        </Dialog>

        {/* Confirm discard dialog */}
        <Dialog open={confirmDiscardOpen} onClose={() => setConfirmDiscardOpen(false)}>
          <DialogTitle sx={{ color: '#fff' }}>Discard this section?</DialogTitle>
          <DialogContent sx={{ color: '#ddd' }}>
            <Typography>Unsaved content will be removed. Your last saved draft remains available to reload from the Publish ribbon.</Typography>
          </DialogContent>
          <DialogActions sx={{ pb: 2, px: 2 }}>
            <Button onClick={() => setConfirmDiscardOpen(false)} color="secondary">Cancel</Button>
            <Button onClick={() => { setSuspendDraftSave(true); setWriteSections((prev) => prev.filter((s: any) => s.id !== 'new')); setSelectedWriteSection(''); setNewSectionData({ title: '', body: '', mediaURI: '', sources: [], keywords: [] }); setMediaPreview(''); setSuspendDraftSave(false); setConfirmDiscardOpen(false); }} color="primary" variant="contained">Discard</Button>
          </DialogActions>
        </Dialog>

        {/* Info modal */}
        <Dialog open={infoModal.open} onClose={() => setInfoModal({ open: false, title: '', message: '' })}>
          <DialogTitle sx={{ color: '#fff' }}>{infoModal.title}</DialogTitle>
          <DialogContent sx={{ color: '#ddd' }}>
            <Typography>{infoModal.message}</Typography>
          </DialogContent>
          <DialogActions sx={{ pb: 2, px: 2 }}>
            <Button onClick={() => setInfoModal({ open: false, title: '', message: '' })} color="primary" variant="contained">OK</Button>
          </DialogActions>
        </Dialog>

        {/* Tutorial Wizard */}
        <Dialog open={tutorialOpen && activeTab === 'publisher'} onClose={closeTutorial} fullWidth maxWidth="md" PaperProps={{ sx: { background: 'rgba(25,25,25,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' } }}>
          <DialogTitle sx={{ color: '#fff' }}>Getting Started: Mythology</DialogTitle>
          <DialogContent>
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {tutorialSteps.map((s, i) => (
                <Button key={i} size="small" onClick={() => setTutorialStep(i)} sx={{ color: '#fff', textTransform: 'none', borderBottom: tutorialStep === i ? `2px solid ${accentColor}` : '2px solid transparent', borderRadius: 0 }}>{i + 1}. {s.title}</Button>
              ))}
            </Box>
            <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>{tutorialSteps[tutorialStep].title}</Typography>
            <Typography sx={{ color: '#ddd' }}>{tutorialSteps[tutorialStep].body}</Typography>
            {tutorialStep === 1 && (
              <Box mt={2}>
                <Button variant="contained" onClick={() => { closeTutorial(); setOpenAddStory(true); }} sx={{ backgroundColor: accentColor }}>Add Story</Button>
              </Box>
            )}
            {tutorialStep === 2 && (
              <Box mt={2}>
                <Button variant="contained" onClick={() => { closeTutorial(); setPublisherRibbon('narrative'); setOpenAddChapter(true); }} sx={{ backgroundColor: accentColor }}>Add Chapter</Button>
              </Box>
            )}
            {tutorialStep === 3 && (
              <Box mt={2} display="flex" gap={1}>
                <Button variant="contained" onClick={() => { closeTutorial(); setPublisherRibbon('metadata'); scrollToRef(titleInputRef.current); }} sx={{ backgroundColor: accentColor }}>Add Title</Button>
                <Button variant="outlined" onClick={() => { closeTutorial(); setPublisherRibbon('metadata'); scrollToRef(mediaInputRef.current); }} sx={{ color: '#fff', borderColor: '#fff' }}>Add Media</Button>
              </Box>
            )}
            {tutorialStep === 4 && (
              <Box mt={2} display="flex" gap={1}>
                <Button variant="contained" onClick={() => { closeTutorial(); setPublisherRibbon('publish'); }} sx={{ backgroundColor: accentColor }}>Publish</Button>
                <Button variant="outlined" onClick={() => { closeTutorial(); setPublisherRibbon('publish'); loadDraft(); }} sx={{ color: '#fff', borderColor: '#fff' }}>Load Draft</Button>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ pb: 2, px: 2 }}>
            <Typography sx={{ color: '#aaa', flex: 1 }}>Step {tutorialStep + 1} of {tutorialSteps.length}</Typography>
            <Button onClick={closeTutorial} color="secondary">Skip</Button>
            {tutorialStep < tutorialSteps.length - 1 ? (
              <Button onClick={() => setTutorialStep((s) => s + 1)} color="primary" variant="contained">Next</Button>
            ) : (
              <Button onClick={closeTutorial} color="primary" variant="contained">Finish</Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Reader Tutorial */}
        <Dialog open={readerTutorialOpen && activeTab === 'viewer'} onClose={closeReaderTutorial} fullWidth maxWidth="md" PaperProps={{ sx: { background: 'rgba(25,25,25,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' } }}>
          <DialogTitle sx={{ color: '#fff' }}>Reading Guide</DialogTitle>
          <DialogContent>
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {readerTutorialSteps.map((s, i) => (
                <Button key={i} size="small" onClick={() => setReaderTutorialStep(i)} sx={{ color: '#fff', textTransform: 'none', borderBottom: readerTutorialStep === i ? `2px solid ${accentColor}` : '2px solid transparent', borderRadius: 0 }}>{i + 1}. {s.title}</Button>
              ))}
            </Box>
            <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>{readerTutorialSteps[readerTutorialStep].title}</Typography>
            <Typography sx={{ color: '#ddd' }}>{readerTutorialSteps[readerTutorialStep].body}</Typography>
          </DialogContent>
          <DialogActions sx={{ pb: 2, px: 2 }}>
            <Typography sx={{ color: '#aaa', flex: 1 }}>Step {readerTutorialStep + 1} of {readerTutorialSteps.length}</Typography>
            <Button onClick={closeReaderTutorial} color="secondary">Skip</Button>
            {readerTutorialStep < readerTutorialSteps.length - 1 ? (
              <Button onClick={() => setReaderTutorialStep((s) => s + 1)} color="primary" variant="contained">Next</Button>
            ) : (
              <Button onClick={closeReaderTutorial} color="primary" variant="contained">Finish</Button>
            )}
          </DialogActions>
        </Dialog>

      </Box>
    </Container>
  );
};

export default Mythology;
