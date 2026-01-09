# Whisper

A Twitter-inspired social media application built with Node.js and Next.js (TypeScript).


---
### Project overview: 
- Purpose: A minimalist Twitter-like social app where users can post short messages, follow other users, and interact (like, comment, repost).
- Scope: UI built with Next.js (React + SSR/SSG), server-side logic implemented with Node.js, and TypeScript across the codebase for type-safety.
- Architecture: Implements a microservice based backend with Polygot Persistence for each microservice.
- Implementing Kafka Queues for an eventually consistent setup.

# Microservices Implemented:
## 1. Auth Microservice
- Handles login/signup and is the source of truth for the basic information of user.
- DB used: Postgresql (with Prisma ORM) for structured user information.
## 2. Follow Microservice
- Handles follows/unfollows and has a follower recommendation system.
- DB used: Uses Neo4j for modeling users and follow relationships as a native graph, enabling fast traversals for followers/mutual, recommendations, and shortest-path queries.
## 3. Post Microservice
- Handles Post, Likes & Comment creation, deletion.
- DB used: Uses MongoDb for flexible information storage for posts.
## 4. Embed Microservice
- Handles embeddings of user posts for a recommendation system.
- DB used: Uses Pinecone for vector embeddings and ANN search.

Author: [Aryan](https://github.com/aryanlmfaoo/)

---
