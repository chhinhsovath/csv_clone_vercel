# Vercel Clone Dashboard

The web-based frontend dashboard for the Vercel Clone deployment platform, built with Next.js 14, React, and TypeScript.

## Features

- 🔐 User authentication (login/signup)
- 📦 Project management
- 🚀 Deployment tracking
- 🌐 Domain management
- 🔧 Environment variables
- 📊 Dashboard overview

## Tech Stack

- **Framework**: Next.js 14
- **UI**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Formatting**: date-fns

## Project Structure

```
apps/dashboard/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home/redirect page
│   ├── globals.css             # Global styles
│   ├── auth/
│   │   ├── login/page.tsx      # Login page
│   │   └── signup/page.tsx     # Signup page
│   └── dashboard/
│       ├── layout.tsx          # Dashboard layout with navbar
│       ├── page.tsx            # Projects list
│       ├── settings/page.tsx   # User settings
│       └── projects/
│           ├── create/page.tsx # Create project
│           └── [id]/
│               ├── page.tsx    # Project details
│               ├── settings/   # Project settings (placeholder)
│               ├── env/        # Environment variables (placeholder)
│               └── domains/    # Domain management (placeholder)
├── lib/
│   ├── api-client.ts           # API client singleton
│   ├── auth-store.ts           # Auth state (Zustand)
│   └── project-store.ts        # Projects state (Zustand)
├── types/
│   └── index.ts                # TypeScript type definitions
├── middleware.ts               # Authentication middleware
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies
└── README.md                   # This file
```

## Getting Started

### Installation

```bash
# From the project root
npm install

# Or just the dashboard app
cd apps/dashboard
npm install
```

### Development

```bash
# From the project root
npm run dev

# Or just the dashboard
cd apps/dashboard
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Build

```bash
# From the project root
npm run build

# Or just the dashboard
cd apps/dashboard
npm run build
```

## Environment Variables

Create a `.env.local` file in the dashboard directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

## Pages Overview

### Authentication Pages

#### `/auth/login`
- User login with email and password
- Automatic redirect to dashboard on success
- Error handling and validation

#### `/auth/signup`
- New user registration
- Password validation (min 8 characters)
- Name, email, password fields

### Dashboard Pages

#### `/dashboard`
- Overview of all projects
- Create new project button
- Project cards with quick info
- Responsive grid layout

#### `/dashboard/projects/create`
- Create new project form
- Git repository configuration
- Build settings
- Framework selection

#### `/dashboard/projects/[id]`
- Project overview
- Repository information
- Build configuration
- Deployments section
- Domains management
- Environment variables
- Project metadata

#### `/dashboard/settings`
- User account information
- Preferences
- API keys management
- Logout button

## API Integration

The dashboard uses the `apiClient` singleton to communicate with the backend:

```typescript
import { apiClient } from '@/lib/api-client'

// Register
await apiClient.register(email, password, name)

// Login
await apiClient.login(email, password)

// Get current user
await apiClient.getCurrentUser()

// Projects
await apiClient.getProjects()
await apiClient.getProject(id)
await apiClient.createProject(data)
await apiClient.updateProject(id, data)
await apiClient.deleteProject(id)
```

## State Management

Uses Zustand for global state:

### Auth Store

```typescript
import { useAuthStore } from '@/lib/auth-store'

const { user, token, login, register, logout } = useAuthStore()
```

### Project Store

```typescript
import { useProjectStore } from '@/lib/project-store'

const {
  projects,
  selectedProject,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} = useProjectStore()
```

## Styling

- **Tailwind CSS** for utility-first styling
- Custom color scheme with `brand-*` colors
- Responsive design with mobile-first approach
- Dark mode ready (base styles prepared)

### Custom Classes

```css
/* Cards */
.card - Basic card styling
.card-hover - Card with hover effects

/* Status badges */
.badge-success - Success status
.badge-error - Error status
.badge-building - Build in progress

/* Utility */
.text-muted - Muted text
.text-error - Error text
```

## Components to Create

### Phase 3.2: Project Management UI
- [ ] ProjectCard (done via inline component)
- [ ] CreateProjectModal
- [ ] ProjectSettings
- [ ] ProjectActions

### Phase 3.3: Deployment Management
- [ ] DeploymentsList
- [ ] DeploymentCard
- [ ] LogStream
- [ ] DeploymentStatus

### Phase 3.4: Settings & Configuration
- [ ] EnvironmentVariables
- [ ] EnvironmentVariableForm
- [ ] BuildSettings
- [ ] DomainManagement

### Phase 3.5: Responsive Design
- [ ] Mobile navigation drawer
- [ ] Responsive grid layouts
- [ ] Touch-friendly interactions

## Common Tasks

### Add a New Page

1. Create file in `app/dashboard/[route]/page.tsx`
2. Add navigation link in `app/dashboard/layout.tsx`
3. Import necessary stores/components
4. Implement page logic

### Add a New Component

1. Create file in `components/` with consistent naming
2. Use TypeScript for prop types
3. Implement with Tailwind CSS
4. Export for use in pages

### Add API Endpoint

1. Add method in `lib/api-client.ts`
2. Create Zustand action if needed
3. Use in page or component

## Debugging

### Check API Connection

```bash
# Verify API is running
curl http://localhost:9000/health

# Check token in localStorage
localStorage.getItem('token')

# View network requests in DevTools
```

### Common Issues

**"Cannot reach API"**
- Check NEXT_PUBLIC_API_URL in .env.local
- Verify API server is running on port 9000
- Check browser console for CORS errors

**"Token expired"**
- Dashboard automatically clears on 401
- User redirected to login
- Implement token refresh logic if needed

**"Styles not loading"**
- Clear .next folder: `rm -rf .next`
- Rebuild: `npm run build`

## Testing

```bash
# Run linting
npm run lint

# Type check
npm run type-check
```

## Performance Optimization

- Image optimization ready (Next.js Image component)
- Code splitting by route
- Lazy loading for modals/drawers
- Optimized API calls with Zustand

## Security

- JWT tokens stored in localStorage
- HTTPS ready for production
- Input validation on forms
- XSS protection via React
- CSRF protection ready

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t vercel-clone-dashboard .
docker run -p 3000:3000 vercel-clone-dashboard
```

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Mobile app version
- [ ] Real-time updates via WebSocket
- [ ] Analytics dashboard
- [ ] Team collaboration features
- [ ] Advanced filtering and search
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements

## Support

For issues or questions:
1. Check the documentation in the root project folder
2. Review API server logs
3. Check browser console for errors
4. See troubleshooting in main README

## Contributing

When adding new features:
1. Follow existing code style
2. Use TypeScript strictly
3. Add proper error handling
4. Test in multiple browsers
5. Update this README if needed

## License

MIT License - See main project LICENSE file
