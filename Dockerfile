# Set the base image to the official Node.js one
FROM node:4.2.4

# File Author / Maintainer
MAINTAINER Jacopo Daeli <jacopo.daeli@gmail.com>

# Copy package.json file
COPY ./package.json /src

# Install app dependencies
RUN npm install

# Bundle app source
COPY . /src

# Change working directory
WORKDIR /src

# Expose port app is running on
EXPOSE 5000

CMD ["node", "index.js"]
