FROM node:16-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 5000

ENV PORT=5000
ENV HOST=0.0.0.0

CMD ["npm", "run", "start"]