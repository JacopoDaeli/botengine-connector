# Set the base image to the official Node.js one
FROM node:4.2.4

# File Author / Maintainer
MAINTAINER Jacopo Daeli <jacopo.daeli@gmail.com>

# Bundle app source
COPY . /src

# Change working directory
WORKDIR /src

# Install app dependencies
RUN npm install

# Expose port app is running on
EXPOSE 5000

CMD ["node", "app/server.js"]
