# Manga Panel Viewer - Design Document & Technical Specification

## Executive Summary

### Project Overview
A web-based application that brings modern guided view functionality to manga, addressing the gap in panel-by-panel reading experiences for Japanese comics. The system combines automatic panel detection with manual refinement tools and customisable transition animations.

### Key Value Propositions
- **First-to-market** guided view specifically optimised for manga's right-to-left reading order
- **Hybrid approach** combining AI-powered auto-detection with manual refinement
- **Community-driven** panel definitions that improve over time
- **Customisable** reading experience with per-transition animations

---

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Reader    │  │    Editor    │  │   Community Hub  │   │
│  │  Component  │  │   Component  │  │    Component     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                     API Gateway (Kong/Nginx)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Backend Services (Node.js)                │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Panel Service│  │ Auth Service │  │ Manga Service   │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  ML Service  │  │Export Service│  │Analytics Service│  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │   S3/CloudFront │  │
│  │   (Primary)  │  │   (Cache)    │  │   (Media CDN)   │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Tailwind CSS + Radix UI
- **Canvas/Graphics**: Konva.js for advanced canvas operations
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library + Playwright

#### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: NestJS (microservices architecture)
- **API**: GraphQL (Apollo Server) + REST fallback
- **Queue**: BullMQ with Redis
- **Database ORM**: Prisma
- **Testing**: Jest + Supertest

#### Machine Learning
- **Panel Detection**: Python service with FastAPI
- **ML Framework**: PyTorch/TensorFlow
- **Computer Vision**: OpenCV + Detectron2
- **Model Serving**: TorchServe or TensorFlow Serving

#### Infrastructure
- **Container**: Docker + Kubernetes
- **CI/CD**: GitHub Actions / GitLab CI
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Error Tracking**: Sentry

---

## Data Models

### Core Entities

```typescript
// User
interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'editor' | 'admin';
  subscription: SubscriptionTier;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Manga/Comic
interface Manga {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  volumes: Volume[];
  metadata: MangaMetadata;
  coverImage: string;
  language: string;
  readingDirection: 'rtl' | 'ltr';
  tags: string[];
  createdAt: Date;
}

// Volume/Chapter
interface Volume {
  id: string;
  mangaId: string;
  volumeNumber: number;
  chapters: Chapter[];
  title?: string;
  releaseDate?: Date;
}

interface Chapter {
  id: string;
  volumeId: string;
  chapterNumber: number;
  title?: string;
  pages: Page[];
  publishedAt?: Date;
}

// Page & Panels
interface Page {
  id: string;
  chapterId: string;
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  panelDefinitions: PanelDefinition[];
  autoDetectionVersion?: string;
  manuallyVerified: boolean;
}

interface PanelDefinition {
  id: string;
  pageId: string;
  userId: string; // Who created/edited this
  version: number;
  panels: Panel[];
  transitions: PanelTransition[];
  confidence: number; // ML confidence or community rating
  status: 'auto' | 'verified' | 'community' | 'official';
  votes: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Panel {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: 'normal' | 'splash' | 'spread' | 'overlay';
  metadata?: {
    hasText: boolean;
    hasSFX: boolean;
    importance: 'low' | 'medium' | 'high';
  };
}

interface PanelTransition {
  fromIndex: number;
  toIndex: number;
  animation: AnimationType;
  duration?: number;
  easing?: string;
}

// User Interactions
interface ReadingSession {
  id: string;
  userId: string;
  chapterId: string;
  currentPage: number;
  currentPanel: number;
  startedAt: Date;
  lastActivity: Date;
  completed: boolean;
  readingMode: 'guided' | 'page' | 'spread';
}

interface PanelDefinitionVote {
  userId: string;
  definitionId: string;
  vote: 1 | -1;
  createdAt: Date;
}
```

---

## API Design

### GraphQL Schema (Primary API)

```graphql
type Query {
  # Manga queries
  manga(id: ID!): Manga
  searchManga(query: String!, limit: Int = 20): [Manga!]!
  popularManga(limit: Int = 20): [Manga!]!
  
  # Reading experience
  chapter(id: ID!): Chapter
  panelDefinition(pageId: ID!, version: String): PanelDefinition
  bestPanelDefinition(pageId: ID!): PanelDefinition
  
  # User data
  readingHistory(limit: Int = 50): [ReadingSession!]!
  userPanelDefinitions: [PanelDefinition!]!
}

type Mutation {
  # Panel management
  createPanelDefinition(input: PanelDefinitionInput!): PanelDefinition!
  updatePanelDefinition(id: ID!, input: PanelDefinitionInput!): PanelDefinition!
  votePanelDefinition(id: ID!, vote: Int!): PanelDefinition!
  
  # Reading progress
  updateReadingProgress(input: ReadingProgressInput!): ReadingSession!
  
  # ML operations
  requestAutoDetection(pageId: ID!): DetectionJob!
}

type Subscription {
  # Real-time collaboration
  panelDefinitionUpdated(pageId: ID!): PanelDefinition!
  
  # Processing status
  detectionJobStatus(jobId: ID!): DetectionJob!
}
```

### REST API Endpoints (Fallback/Legacy)

```yaml
# Panel Detection
POST   /api/v1/detect
  body: { imageUrl: string, settings: DetectionSettings }
  response: { panels: Panel[], confidence: number }

# Panel Definitions
GET    /api/v1/pages/{pageId}/panels
POST   /api/v1/pages/{pageId}/panels
PUT    /api/v1/panels/{definitionId}
DELETE /api/v1/panels/{definitionId}

# Export/Import
GET    /api/v1/export/epub/{chapterId}
POST   /api/v1/import/panels
  body: { format: 'json' | 'cbr' | 'epub', data: any }
```

---

## Core Features Specification

### 1. Panel Detection Engine

#### Automatic Detection
- **Computer Vision Pipeline**:
  1. Pre-processing: Noise reduction, contrast enhancement
  2. Gutter detection: Identify white spaces using adaptive thresholding
  3. Panel extraction: Connected component analysis
  4. Reading order inference: Right-to-left, top-to-bottom sorting
  5. Panel classification: Normal, splash, spread detection

- **ML Model Architecture**:
  - Base: Mask R-CNN or YOLO for panel detection
  - Training data: 50,000+ manually annotated manga pages
  - Augmentation: Handle various art styles, scan qualities
  - Confidence scoring: Provide reliability metrics

#### Manual Refinement Tools
- **Drawing modes**: Rectangle, polygon, freeform
- **Split/merge operations**: Divide or combine panels
- **Reordering**: Drag-and-drop with visual preview
- **Batch operations**: Apply to similar pages
- **Keyboard shortcuts**: Professional efficiency

### 2. Reading Experience

#### Guided View Mode
- **Navigation**:
  - Touch/swipe gestures on mobile
  - Keyboard arrows on desktop
  - Click zones for next/previous
  - Mini-map overview

- **Transitions**:
  - Animation library: 10+ transition types
  - Per-panel customisation
  - Speed controls
  - Motion preferences (reduced motion support)

#### Page View Mode
- **Features**:
  - Double-page spreads
  - Zoom and pan
  - Panel highlighting on hover
  - Quick switch to guided view

### 3. Community Features

#### Shared Panel Definitions
- **Contribution system**:
  - Submit panel definitions
  - Vote on quality
  - Earn reputation points
  - Moderation tools

- **Version control**:
  - Track changes
  - Revert to previous versions
  - Fork definitions
  - Merge improvements

#### Collaborative Editing
- **Real-time collaboration**:
  - WebSocket-based sync
  - Conflict resolution
  - Live cursors
  - Chat integration

### 4. Export & Integration

#### Export Formats
- **EPUB3 with Media Overlays**: Industry-standard guided view
- **CBZ/CBR with ComicInfo.xml**: Compatible with major readers
- **JSON**: Raw panel data for developers
- **Video**: MP4 with Ken Burns effect

#### Reader Integration
- **Browser extension**: Add guided view to any manga site
- **API SDK**: JavaScript, Python, Java libraries
- **Webhooks**: Real-time updates for third-party apps

---

## Performance Requirements

### Frontend Performance
- **Initial load**: < 2 seconds (FCP)
- **Panel transition**: < 100ms
- **Image loading**: Progressive with blur-up
- **Memory usage**: < 200MB for 50-page chapter
- **Offline support**: Service Worker with smart caching

### Backend Performance
- **API response time**: p95 < 200ms
- **Panel detection**: < 5 seconds per page
- **Concurrent users**: 10,000+ simultaneous readers
- **Storage optimisation**: WebP with fallback to JPEG
- **CDN strategy**: Multi-region with edge caching

### Scalability Targets
- **Users**: 1M+ registered users
- **Content**: 100,000+ manga titles
- **Definitions**: 10M+ panel definitions
- **Daily reads**: 50M+ panel views

---

## Security & Privacy

### Authentication & Authorisation
- **OAuth 2.0**: Google, Discord, Twitter
- **JWT tokens**: Short-lived access, refresh tokens
- **Role-based access**: User, Editor, Moderator, Admin
- **2FA support**: TOTP authentication

### Content Protection
- **DRM considerations**: Optional publisher integration
- **Watermarking**: Invisible user ID embedding
- **Rate limiting**: API and download restrictions
- **DMCA compliance**: Takedown request handling

### Data Privacy
- **GDPR compliance**: Data portability, right to deletion
- **Analytics**: Privacy-preserving (no PII)
- **Encryption**: TLS 1.3, AES-256 for sensitive data

---

## Monetisation Strategy

### Subscription Tiers

#### Free Tier
- 10 manga per month
- Auto-detection only
- Community panel definitions
- Standard transitions

#### Premium ($4.99/month)
- Unlimited manga
- Manual editing tools
- Custom transitions
- Priority processing
- No ads

#### Pro ($9.99/month)
- Everything in Premium
- Batch processing
- API access
- Export to all formats
- Collaboration tools

### Additional Revenue
- **Publisher partnerships**: Licensed content
- **White-label solution**: For manga platforms
- **API usage**: Pay-per-detection for developers

---

## Development Roadmap

### Phase 1: MVP (3 months)
- ✅ Basic panel detection
- ✅ Manual editing
- ✅ Guided view with transitions
- [ ] User accounts
- [ ] Save/load definitions
- [ ] Basic web reader

### Phase 2: Community (2 months)
- [ ] Share panel definitions
- [ ] Voting system
- [ ] User profiles
- [ ] Basic moderation
- [ ] Mobile responsive

### Phase 3: ML Enhancement (3 months)
- [ ] Train custom model
- [ ] Improve detection accuracy
- [ ] Handle complex layouts
- [ ] Batch processing
- [ ] Confidence scoring

### Phase 4: Platform (2 months)
- [ ] iOS/Android apps
- [ ] Browser extension
- [ ] API public release
- [ ] Publisher tools
- [ ] Analytics dashboard

### Phase 5: Scale (Ongoing)
- [ ] Multi-language support
- [ ] Advanced collaboration
- [ ] AI-powered enhancements
- [ ] Third-party integrations
- [ ] Enterprise features

---

## Testing Strategy

### Unit Testing
- **Coverage target**: 80%+
- **Critical paths**: 100% coverage
- **Mock external services**

### Integration Testing
- **API testing**: All endpoints
- **Database transactions**
- **File upload/processing**

### E2E Testing
- **User journeys**: Complete workflows
- **Cross-browser**: Chrome, Firefox, Safari, Edge
- **Device testing**: Desktop, tablet, mobile

### Performance Testing
- **Load testing**: 10,000 concurrent users
- **Stress testing**: Find breaking points
- **Spike testing**: Sudden traffic increases

### ML Model Testing
- **Accuracy metrics**: Precision, recall, F1
- **A/B testing**: Model versions
- **Edge cases**: Unusual panel layouts

---

## Deployment & Operations

### Infrastructure
```yaml
Production:
  Kubernetes Cluster:
    - 3x API servers (autoscaling)
    - 2x ML services (GPU nodes)
    - Background workers (autoscaling)
  
  Database:
    - Primary: PostgreSQL (RDS/CloudSQL)
    - Read replicas: 2x
    - Redis cluster: 3 nodes
  
  Storage:
    - S3/GCS for images
    - CloudFront/Fastly CDN
    
Staging:
  - Mirror of production (smaller scale)
  
Development:
  - Docker Compose local environment
```

### Monitoring
- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack
- **APM**: DataDog or New Relic
- **Uptime**: 99.9% SLA

### Disaster Recovery
- **Backups**: Daily automated, 30-day retention
- **RPO**: 1 hour
- **RTO**: 4 hours
- **Failover**: Multi-region support

---

## Success Metrics

### User Metrics
- **MAU**: Monthly active users
- **Retention**: Day 1, 7, 30
- **Reading completion rate**
- **Panels read per session**

### Technical Metrics
- **Detection accuracy**: >90%
- **API latency**: p99 < 500ms
- **Error rate**: <0.1%
- **Uptime**: >99.9%

### Business Metrics
- **Conversion rate**: Free to paid
- **Churn rate**: <5% monthly
- **Community contributions**: Definitions per day
- **API usage**: Calls per month

---

## Risk Analysis

### Technical Risks
- **ML accuracy**: May struggle with artistic styles
  - *Mitigation*: Fallback to manual, continuous training
  
- **Scale challenges**: Viral growth scenario
  - *Mitigation*: Auto-scaling, CDN, caching strategy

- **Browser compatibility**: Canvas API limitations
  - *Mitigation*: Progressive enhancement, fallbacks

### Business Risks
- **Copyright concerns**: Publisher pushback
  - *Mitigation*: Clear fair use, partner programme
  
- **Competition**: Larger players enter market
  - *Mitigation*: First-mover advantage, community moat

### Operational Risks
- **Data loss**: System failure
  - *Mitigation*: Regular backups, disaster recovery
  
- **Security breach**: User data exposed
  - *Mitigation*: Security audits, encryption, compliance

---

## Conclusion

This specification outlines a comprehensive plan to transform the manga panel viewer prototype into a production-ready platform. The hybrid approach of ML-powered detection with community refinement creates a unique value proposition in the digital manga reading space.

The modular architecture allows for iterative development while maintaining scalability. Focus on community features creates a defensive moat through network effects, while the technical foundation supports future expansion into related markets (webtoons, Western comics).

Key success factors:
1. **Detection accuracy** must exceed 85% for user trust
2. **Community engagement** drives content quality
3. **Performance** ensures smooth reading experience
4. **Developer ecosystem** expands platform reach

With proper execution, this platform can become the industry standard for guided manga reading, similar to how ComiXology transformed Western comic consumption.