import { Box, Flex, Text, Heading } from "@radix-ui/themes";
import { NavLink } from "react-router-dom";
import {
  DiscIcon,
  HomeIcon,
  PersonIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import React from "react";

const navItems = [
  { name: "Library", path: "/", icon: <HomeIcon /> },
  { name: "Artists", path: "/artists", icon: <PersonIcon /> },
  { name: "Releases", path: "/releases", icon: <DiscIcon /> },
  { name: "Playlists", path: "/playlists", icon: <RocketIcon /> },
];

const Sidebar: React.FC = () => (
  <Flex direction="column" height="100%" p="4">
    <Flex align="center" gap="2" mb="6">
      <img src="/cherry.webp" alt="Cherry" width="24" height="24" />
      <Heading size="6">SoA</Heading>
    </Flex>

    <Box flexGrow="1">
      {navItems.map((item) => (
        <NavLink to={item.path} key={item.name} className="nav-link">
          {({ isActive }) => (
            <Flex
              align="center"
              gap="3"
              p="2"
              my="1"
              className={isActive ? "nav-link-active" : ""}
            >
              {item.icon}
              <Text size="3">{item.name}</Text>
            </Flex>
          )}
        </NavLink>
      ))}
    </Box>

    <Box>
      <Text size="1" color="gray">
        J4ckacc
      </Text>
    </Box>
  </Flex>
);

export default Sidebar;
