export interface Config {
  port: number | string;
  mongodb: {
    uri: string;
    options: {
      useNewUrlParser: boolean;
      useUnifiedTopology: boolean;
    };
  };
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  jwt: {
    secret: string;
  };
  cors: {
    origin: string;
    credentials: boolean;
    methods: string[];
  };
} 